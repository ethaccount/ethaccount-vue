import { AccountId, ValidatorKey } from '@/types'
import { defineStore, storeToRefs } from 'pinia'
import {
	ADDRESS,
	EOAValidatorModule,
	ERC7579Validator,
	KernelV3Account,
	NexusAccount,
	SmartAccount,
	WebAuthnValidatorModule,
} from 'sendop'
import { useBlockchain, useBlockchainStore } from './useBlockchain'
import { useEOA } from './useEOA'
import { signMessage } from '@/lib/passkey'

export type ConnectedAccount = {
	address: string
	chainId: string
	validator: ValidatorKey
	accountId: AccountId
}

export const useSAStore = defineStore(
	'useSAStore',
	() => {
		const account = ref<ConnectedAccount | null>(null)

		const setAccount = (_account: ConnectedAccount) => {
			account.value = _account
		}

		const resetAccount = () => {
			account.value = null
		}

		const isConnected = computed(() => {
			return !!account.value && !!erc7579Validator.value && !!smartAccount.value
		})

		const { client, bundler, pmGetter, chainId } = useBlockchain()
		const { signer } = useEOA()

		watch(chainId, chainId => {
			if (chainId !== account.value?.chainId) {
				resetAccount()
			}
		})

		watch(account, account => {
			if (account) {
				// 如果 chainId 跟 app 不一樣，要 disconnect
				const blockchainStore = useBlockchainStore()
				if (account.chainId !== blockchainStore.chainId) {
					resetAccount()
					console.error('Account chainId mismatch', account.chainId, blockchainStore.chainId)
				}
			}
		})

		const erc7579Validator = computed<ERC7579Validator | null>(() => {
			switch (account.value?.validator) {
				case 'eoa':
					if (!signer.value) {
						return null
					}
					return new EOAValidatorModule({
						address: ADDRESS.ECDSAValidator,
						signer: signer.value,
					})
				case 'passkey':
					return new WebAuthnValidatorModule({
						address: ADDRESS.WebAuthnValidator,
						signMessage,
					})

				default:
					return null
			}
		})

		const smartAccount = computed<SmartAccount | null>(() => {
			if (!erc7579Validator.value) {
				return null
			}

			switch (account.value?.accountId) {
				case AccountId.KERNEL:
					return new KernelV3Account({
						address: account.value?.address,
						client: client.value,
						bundler: bundler.value,
						validator: erc7579Validator.value,
						pmGetter: pmGetter.value,
					})
				case AccountId.NEXUS:
					return new NexusAccount({
						address: account.value?.address,
						client: client.value,
						bundler: bundler.value,
						validator: erc7579Validator.value,
						pmGetter: pmGetter.value,
					})
				default:
					return null
			}
		})

		return {
			account,
			setAccount,
			resetAccount,
			isConnected,
			smartAccount,
		}
	},
	{
		persist: {
			pick: ['account'],
		},
	},
)

export function useSA() {
	const store = useSAStore()
	return {
		...store,
		...storeToRefs(store),
	}
}
