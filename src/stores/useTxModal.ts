import TxModal from '@/components/TxModal.vue'
import { UserOpDirector } from '@/lib/UserOpDirector'
import { useAccount } from '@/stores/account/useAccount'
import { useBlockchain } from '@/stores/blockchain/useBlockchain'
import { defineStore, storeToRefs } from 'pinia'
import { Execution, PublicPaymaster, UserOpBuilder, UserOperationReceipt } from 'sendop'
import { useModal } from 'vue-final-modal'
import { useSigner } from './useSigner'

export enum TransactionStatus {
	Estimation = 'Estimation',
	Estimating = 'Estimating',
	Sign = 'Sign',
	Signing = 'Signing',
	Send = 'Send',
	Sending = 'Sending',
	Pending = 'Pending',
	Success = 'Success',
	Failed = 'Failed',
}

export type TxModalExecution = Execution & {
	description?: string
}

export const useTxModalStore = defineStore('useTxModalStore', () => {
	const defaultProps: InstanceType<typeof TxModal>['$props'] = {
		executions: [],
		onClose: () => close(),
	}

	const { open, close, patchOptions } = useModal({
		component: TxModal,
		attrs: {
			...defaultProps,
		},
		slots: {},
	})

	function openModal(props?: InstanceType<typeof TxModal>['$props']) {
		patchOptions({
			attrs: {
				...defaultProps, // must set default props to clear the props
				...props,
			},
		})
		open()
	}

	const { bundler, selectedChainId, client, fetchGasPrice } = useBlockchain()
	const { selectedAccount, accountVMethods } = useAccount()
	const { selectedSignerType } = useSigner()

	const paymasters = [
		{ id: 'none', name: 'No Paymaster', description: 'Pay gas fees with native tokens' },
		{ id: 'public', name: 'Public Paymaster', description: 'Use public paymaster for gas sponsorship' },
	] as const

	const selectedPaymaster = ref<(typeof paymasters)[number]['id']>('public')

	const status = ref<TransactionStatus>(TransactionStatus.Estimation)

	const canEstimate = computed(() => {
		if (status.value !== TransactionStatus.Estimation) return false
		if (!selectedPaymaster.value) return false
		return true
	})

	const canSign = computed(() => {
		if (status.value !== TransactionStatus.Sign) return false
		return true
	})

	const canSend = computed(() => {
		if (status.value !== TransactionStatus.Send) return false
		return true
	})

	const userOp = ref<UserOpBuilder | null>(null)
	const opHash = ref<string | null>(null)
	const opReceipt = ref<UserOperationReceipt | null>(null)

	async function handleEstimate(executions: Execution[], initCode?: string) {
		if (!selectedAccount.value) {
			throw new Error('[handleEstimate] Account not selected')
		}

		if (!selectedSignerType.value) {
			throw new Error('[handleEstimate] No signer selected')
		}

		if (executions.length === 0 && !initCode) {
			throw new Error('[handleEstimate] No executions and no init code provided')
		}

		const op = new UserOpBuilder({
			chainId: selectedChainId.value,
			bundler: bundler.value,
		})

		await UserOpDirector.buildAccountExecutions({
			op,
			accountId: selectedAccount.value.accountId,
			vMethods: accountVMethods.value,
			signerType: selectedSignerType.value,
			accountAddress: selectedAccount.value.address,
			client: client.value,
			executions,
		})

		if (initCode) {
			op.setFactory({
				factory: initCode.slice(0, 42),
				factoryData: '0x' + initCode.slice(42),
			})
		}

		if (selectedPaymaster.value === 'public') {
			op.setPaymaster({
				paymaster: await PublicPaymaster.getPaymaster(),
				paymasterData: await PublicPaymaster.getPaymasterData(),
				paymasterPostOpGasLimit: await PublicPaymaster.getPaymasterPostOpGasLimit(),
			})
		}

		op.setGasPrice(await fetchGasPrice())

		await op.estimateGas()

		// Notice: markRaw is used to prevent TypeError: Cannot read from private field
		// similar issue: https://github.com/vuejs/core/issues/8245
		userOp.value = markRaw(op)
	}

	async function handleSign() {
		if (!userOp.value) {
			throw new Error('[handleSign] User operation not built')
		}

		const { selectedSigner } = useSigner()

		if (!selectedSigner.value) {
			throw new Error('[handleSign] No signer selected')
		}

		const signature = await selectedSigner.value.sign(userOp.value as UserOpBuilder)
		userOp.value.setSignature(signature)
		// Notice to formate signature if needed
	}

	async function handleSend() {
		if (!userOp.value) {
			throw new Error('[handleSend] User operation not built')
		}
		const op = userOp.value

		await op.send()

		// Wait for the transaction to be mined
		status.value = TransactionStatus.Pending
		const receipt = await op.wait()

		opReceipt.value = receipt

		if (receipt.success) {
			status.value = TransactionStatus.Success
		} else {
			status.value = TransactionStatus.Failed
		}
	}

	function reset() {
		status.value = TransactionStatus.Estimation
		userOp.value = null
		opHash.value = null
		opReceipt.value = null
		selectedPaymaster.value = 'public'
	}

	return {
		openModal,
		closeModal: close,
		reset,
		handleEstimate,
		handleSign,
		handleSend,
		userOp,
		selectedPaymaster,
		paymasters,
		canEstimate,
		canSign,
		canSend,
		status,
		opHash,
		opReceipt,
	}
})

export function useTxModal() {
	const store = useTxModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
