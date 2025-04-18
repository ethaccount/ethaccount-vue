import Connected from '@/components/connect-modal/Connected.vue'
import CreateDeploy from '@/components/connect-modal/CreateDeploy.vue'
import CreateSignerChoice from '@/components/connect-modal/CreateSignerChoice.vue'
import EOAAccountChoice from '@/components/connect-modal/EOAAccountChoice.vue'
import EOAConnect from '@/components/connect-modal/EOAConnect.vue'
import InitialStep from '@/components/connect-modal/Initial.vue'
import PasskeyAuth from '@/components/connect-modal/PasskeyAuth.vue'
import PasskeyLogin from '@/components/connect-modal/PasskeyLogin.vue'
import { AccountId, ValidatorKey } from '@/types'
import { useBlockchain } from './useBlockchain'
import { useSA } from './useSA'
import PasskeyAccountChoice from '@/components/connect-modal/PasskeyAccountChoice.vue'

export enum ConnectModalStageKey {
	INITIAL = 'INITIAL',

	CREATE_SIGNER_CHOICE = 'CREATE_SIGNER_CHOICE',
	CREATE_EOA_CONNECT = 'CREATE_EOA_CONNECT',
	CREATE_PASSKEY_CONNECT = 'CREATE_PASSKEY_CONNECT',
	CREATE_EIP7702_CONNECT = 'CREATE_EIP7702_CONNECT',
	CREATE_DEPLOY = 'CREATE_DEPLOY',
	CREATE_CONNECTED = 'CREATE_CONNECTED',

	EOA_EOA_CONNECT = 'EOA_EOA_CONNECT',
	EOA_ACCOUNT_CHOICE = 'EOA_ACCOUNT_CHOICE',
	EOA_CONNECTED = 'EOA_CONNECTED',

	PASSKEY_LOGIN = 'PASSKEY_LOGIN',
	PASSKEY_ACCOUNT_CHOICE = 'PASSKEY_ACCOUNT_CHOICE',
	PASSKEY_CONNECTED = 'PASSKEY_CONNECTED',
}

type Stage = {
	component: Component
	next: ConnectModalStageKey[]
	config: StageConfig
}

type StageConfig = {
	title?: string
	requiredFields?: (keyof ConnectModalStore)[]
}

const CONNECT_MODAL_CONFIG: Record<ConnectModalStageKey, Stage> = {
	[ConnectModalStageKey.INITIAL]: {
		component: InitialStep,
		next: [
			ConnectModalStageKey.CREATE_SIGNER_CHOICE,
			ConnectModalStageKey.EOA_EOA_CONNECT,
			ConnectModalStageKey.PASSKEY_LOGIN,
		],
		config: {
			title: 'Connect or Create',
		},
	},
	// ===============================
	// CREATE
	// ===============================
	[ConnectModalStageKey.CREATE_SIGNER_CHOICE]: {
		component: CreateSignerChoice,
		next: [
			ConnectModalStageKey.CREATE_EOA_CONNECT,
			ConnectModalStageKey.CREATE_PASSKEY_CONNECT,
			ConnectModalStageKey.CREATE_EIP7702_CONNECT,
		],
		config: {
			title: 'Choose Signer',
		},
	},
	[ConnectModalStageKey.CREATE_EOA_CONNECT]: {
		component: EOAConnect,
		next: [ConnectModalStageKey.CREATE_DEPLOY],
		config: {
			title: 'Connect EOA Wallet',
			requiredFields: ['validator'],
		},
	},
	[ConnectModalStageKey.CREATE_PASSKEY_CONNECT]: {
		component: PasskeyAuth,
		next: [ConnectModalStageKey.CREATE_DEPLOY],
		config: {
			title: 'Passkey Authentication',
		},
	},
	[ConnectModalStageKey.CREATE_EIP7702_CONNECT]: {
		component: EOAConnect,
		next: [ConnectModalStageKey.CREATE_DEPLOY],
		config: {
			title: 'Connect EOA Wallet',
		},
	},
	[ConnectModalStageKey.CREATE_DEPLOY]: {
		component: CreateDeploy,
		next: [ConnectModalStageKey.CREATE_CONNECTED],
		config: {
			title: 'Deploy Smart Account',
			requiredFields: ['validator'],
		},
	},
	[ConnectModalStageKey.CREATE_CONNECTED]: {
		component: Connected,
		next: [],
		config: {
			title: 'Connected',
		},
	},
	// ===============================
	// Connect via EOA
	// ===============================
	[ConnectModalStageKey.EOA_EOA_CONNECT]: {
		component: EOAConnect,
		next: [ConnectModalStageKey.EOA_ACCOUNT_CHOICE],
		config: {
			title: 'Connect EOA Wallet',
			requiredFields: ['validator'],
		},
	},
	[ConnectModalStageKey.EOA_ACCOUNT_CHOICE]: {
		component: EOAAccountChoice,
		next: [ConnectModalStageKey.EOA_CONNECTED],
		config: {
			title: 'Choose Account',
			requiredFields: ['eoaAddress', 'validator'],
		},
	},
	[ConnectModalStageKey.EOA_CONNECTED]: {
		component: Connected,
		next: [],
		config: {
			title: 'Connected',
			requiredFields: ['deployedAddress', 'accountId', 'validator'],
		},
	},
	// ===============================
	// Connect via Passkey
	// ===============================
	[ConnectModalStageKey.PASSKEY_LOGIN]: {
		component: PasskeyLogin,
		next: [ConnectModalStageKey.PASSKEY_ACCOUNT_CHOICE],
		config: {
			title: 'Passkey Login',
			requiredFields: ['validator'],
		},
	},
	[ConnectModalStageKey.PASSKEY_ACCOUNT_CHOICE]: {
		component: PasskeyAccountChoice,
		next: [ConnectModalStageKey.PASSKEY_CONNECTED],
		config: {
			title: 'Choose Account',
			requiredFields: ['validator'],
		},
	},
	[ConnectModalStageKey.PASSKEY_CONNECTED]: {
		component: Connected,
		next: [],
		config: {
			title: 'Connected',
			requiredFields: ['deployedAddress', 'accountId', 'validator'],
		},
	},
} as const

type ConnectModalStore = {
	openModal: () => void
	closeModal: () => void
	eoaAddress: string | null
	deployedAddress: string | null
	accountId: AccountId | null
	validator: ValidatorKey | null
}

const useConnectModalStore = defineStore('useConnectModalStore', () => {
	const stageKey = ref<ConnectModalStageKey | null>(null)
	const stage = computed<Stage | null>(() => {
		if (!stageKey.value) return null
		return CONNECT_MODAL_CONFIG[stageKey.value] ?? null
	})
	const stageKeyHistory = ref<ConnectModalStageKey[]>([])
	const stageHistory = computed<Stage[]>(() => {
		return stageKeyHistory.value.map(state => {
			if (!CONNECT_MODAL_CONFIG[state]) {
				throw new Error(`stageHistory: Screen not found for state: ${state}`)
			}
			return CONNECT_MODAL_CONFIG[state]
		})
	})

	const store = ref<ConnectModalStore>({
		openModal: () => {},
		closeModal: () => {},
		eoaAddress: null,
		deployedAddress: null,
		accountId: null,
		validator: null,
	})

	const reset = () => {
		stageKey.value = null
		stageKeyHistory.value = []
		store.value = {
			...store.value,
			eoaAddress: null,
			deployedAddress: null,
			accountId: null,
			validator: null,
		}
	}

	const updateStore = (update: Partial<ConnectModalStore>) => {
		store.value = { ...store.value, ...update }
	}

	// ===============================
	// STORE END
	// ===============================

	const canGoBack = computed(() => {
		return stageKeyHistory.value.length > 0
	})

	const canGoNext = computed(() => {
		return (stage.value?.next.length ?? 0) > 0
	})

	const goNextStage = (specificState?: ConnectModalStageKey) => {
		if (!stageKey.value) {
			stageKey.value = ConnectModalStageKey.INITIAL
			return
		}

		const nextState = specificState ?? stage.value?.next[0]
		if (!nextState) {
			throw new Error('No next state found')
		}

		assertValidTransition(stageKey.value, nextState)

		if (!specificState && (stage.value?.next.length ?? 0) === 0) {
			throw new Error('No next state available')
		}

		if (!specificState && (stage.value?.next.length ?? 0) > 1) {
			console.warn(
				`Multiple next states available on ${stageKey.value}, using the first one ${stage.value?.next[0]}`,
			)
		}

		stageKeyHistory.value.push(stageKey.value)
		stageKey.value = nextState
	}

	const goBackStage = () => {
		if (stageKeyHistory.value.length === 0) {
			throw new Error('No history found')
		}
		const previousState = stageKeyHistory.value.pop()
		if (previousState) {
			stageKey.value = previousState
		}
	}

	// =============================== Assertions ===============================

	const assertStage = (_state: ConnectModalStageKey) => {
		if (stageKey.value !== _state) {
			throw new Error(`Invalid state, expected ${_state} but got ${stageKey.value}`)
		}
	}

	const assertValidTransition = (fromStateKey: ConnectModalStageKey, toStateKey: ConnectModalStageKey) => {
		const fromStage = CONNECT_MODAL_CONFIG[fromStateKey]
		const toStage = CONNECT_MODAL_CONFIG[toStateKey]

		if (!fromStage?.next.includes(toStateKey)) {
			throw new Error(
				`Invalid transition from ${fromStateKey} to ${toStateKey}. Allowed transitions: ${fromStage?.next.join(
					', ',
				)}`,
			)
		}

		const requiredFields = toStage.config?.requiredFields
		if (requiredFields) {
			const missingFields = requiredFields.filter(key => !store.value[key])
			if (missingFields.length > 0) {
				throw new Error(`Missing required fields for ${toStateKey}: ${missingFields.join(', ')}`)
			}
		}
	}

	return {
		stageKey,
		stage,
		stageKeyHistory,
		stageHistory,
		store,
		canGoBack,
		canGoNext,
		reset,
		goNextStage,
		goBackStage,
		assertStage,
		updateStore,
	}
})

export function useConnectModal() {
	const store = useConnectModalStore()
	return {
		...store,
		...storeToRefs(store),
	}
}

// =============================== DEV ===============================

export function simulateStage(_stageKey: ConnectModalStageKey) {
	if (!import.meta.env.DEV) {
		throw new Error('Simulate stage is only available in development mode')
	}
	console.warn('Simulating', _stageKey)

	const { stageKey, updateStore, store } = useConnectModal()
	store.value.openModal()
	stageKey.value = _stageKey
	switch (_stageKey) {
		case ConnectModalStageKey.CREATE_CONNECTED:
			const { chainId } = useBlockchain()
			const account = {
				chainId: chainId.value,
				eoaAddress: '0x0924E969a99547374C9F4B43503652fdB28289e4',
				deployedAddress: '0x0924E969a99547374C9F4B43503652fdB28289e4',
				accountId: AccountId.KERNEL,
				validator: 'eoa' as ValidatorKey,
			}
			const { setAccount } = useSA()
			setAccount({
				address: account.deployedAddress,
				chainId: account.chainId,
				accountId: account.accountId,
				validator: account.validator,
			})

			updateStore({
				eoaAddress: account.eoaAddress,
				deployedAddress: account.deployedAddress,
				accountId: account.accountId,
				validator: account.validator,
			})
			break
		case ConnectModalStageKey.EOA_ACCOUNT_CHOICE:
			updateStore({
				validator: 'eoa',
				eoaAddress: '0xd78B5013757Ea4A7841811eF770711e6248dC282',
			})
			break
		default:
			throw new Error(`Unknown stage: ${_stageKey}`)
	}
}
