import InitialStep from '@/components/connect_modal/Initial.vue'
import CreateSignerChoice from '@/components/connect_modal/CreateSignerChoice.vue'
import EOAConnect from '@/components/connect_modal/EOAConnect.vue'
import PasskeyLogin from '@/components/connect_modal/PasskeyLogin.vue'
import CreateDeploy from '@/components/connect_modal/CreateDeploy.vue'
import Connected from '@/components/connect_modal/Connected.vue'

// Change Stage to ConnectFlowState
export enum ConnectFlowState {
	INITIAL = 'INITIAL',

	CREATE_SIGNER_CHOICE = 'CREATE_SIGNER_CHOICE',
	CREATE_EOA_CONNECT = 'CREATE_EOA_CONNECT',
	CREATE_PASSKEY_CONNECT = 'CREATE_PASSKEY_CONNECT',
	CREATE_EIP7702_CONNECT = 'CREATE_EIP7702_CONNECT',
	CREATE_DEPLOY = 'CREATE_DEPLOY',
	CREATE_CONNECTED = 'CREATE_CONNECTED',

	EOA_EOA_CONNECT = 'EOA_EOA_CONNECT',
}

// Update Step to ModalScreen and related properties
type ModalScreen = {
	state: ConnectFlowState
	component: Component
	next: ConnectFlowState[]
	screenConfig?: (ExtendedScreenConfig[keyof ExtendedScreenConfig] & BaseScreenConfig) | BaseScreenConfig
}

type Store = {
	eoaAddress: string | null
}

// Update metadata to screenConfig
type BaseScreenConfig = {
	hasNextButton?: boolean
	requiredStore?: (keyof Store)[]
}

// Update ExtendedStepMetadata to ExtendedScreenConfig
export type ExtendedScreenConfig = {
	[ConnectFlowState.INITIAL]: {
		gotoCreate: () => void
		gotoEoa: () => void
	}
	[ConnectFlowState.CREATE_SIGNER_CHOICE]: {
		gotoEoa: () => void
		gotoPasskey: () => void
	}
}

export const useConnectModalStore = defineStore('useConnectModalStore', () => {
	// Update STEPS to SCREENS
	const SCREENS: Record<ConnectFlowState, ModalScreen> = {
		[ConnectFlowState.INITIAL]: {
			state: ConnectFlowState.INITIAL,
			component: InitialStep,
			next: [ConnectFlowState.CREATE_SIGNER_CHOICE, ConnectFlowState.EOA_EOA_CONNECT],
			screenConfig: {
				gotoCreate() {
					goNextState(ConnectFlowState.CREATE_SIGNER_CHOICE)
				},
				gotoEoa() {
					goNextState(ConnectFlowState.EOA_EOA_CONNECT)
				},
			} satisfies ExtendedScreenConfig[ConnectFlowState.INITIAL],
		},
		[ConnectFlowState.CREATE_SIGNER_CHOICE]: {
			state: ConnectFlowState.CREATE_SIGNER_CHOICE,
			component: CreateSignerChoice,
			next: [
				ConnectFlowState.CREATE_EOA_CONNECT,
				ConnectFlowState.CREATE_PASSKEY_CONNECT,
				ConnectFlowState.CREATE_EIP7702_CONNECT,
			],
		},
		[ConnectFlowState.CREATE_EOA_CONNECT]: {
			state: ConnectFlowState.CREATE_EOA_CONNECT,
			component: EOAConnect,
			next: [ConnectFlowState.CREATE_DEPLOY],
			screenConfig: {
				hasNextButton: true,
				requiredStore: ['eoaAddress'],
			},
		},
		[ConnectFlowState.CREATE_PASSKEY_CONNECT]: {
			state: ConnectFlowState.CREATE_PASSKEY_CONNECT,
			component: PasskeyLogin,
			next: [ConnectFlowState.CREATE_DEPLOY],
		},
		[ConnectFlowState.CREATE_EIP7702_CONNECT]: {
			state: ConnectFlowState.CREATE_EIP7702_CONNECT,
			component: EOAConnect,
			next: [ConnectFlowState.CREATE_DEPLOY],
		},
		[ConnectFlowState.CREATE_DEPLOY]: {
			state: ConnectFlowState.CREATE_DEPLOY,
			component: CreateDeploy,
			next: [ConnectFlowState.CREATE_CONNECTED],
		},
		[ConnectFlowState.CREATE_CONNECTED]: {
			state: ConnectFlowState.CREATE_CONNECTED,
			component: Connected,
			next: [],
		},
		[ConnectFlowState.EOA_EOA_CONNECT]: {
			state: ConnectFlowState.EOA_EOA_CONNECT,
			component: EOAConnect,
			next: [],
		},
	} as const

	// Update state/step variables to currentState/currentScreen
	const currentState = ref<ConnectFlowState | null>(null)
	const currentScreen = computed<ModalScreen | null>(() => {
		return currentState.value ? SCREENS[currentState.value] : null
	})
	const stateHistory = ref<ConnectFlowState[]>([])
	const screenHistory = computed<ModalScreen[]>(() => {
		return stateHistory.value.map(state => SCREENS[state])
	})

	const reset = () => {
		currentState.value = null
		stateHistory.value = []
	}

	// ===============================
	// STORE
	// ===============================

	const store = ref<Store>({
		eoaAddress: null,
	})

	const updateStore = (update: Partial<Store>) => {
		store.value = { ...store.value, ...update }
	}

	// ===============================
	// STORE END
	// ===============================

	const canGoBack = computed(() => {
		return stateHistory.value.length > 0
	})

	const canGoNext = computed(() => {
		return (currentScreen.value?.next.length ?? 0) > 0
	})

	const hasNextButton = computed(() => {
		return (currentScreen.value?.screenConfig?.hasNextButton ?? false) && canGoNext.value
	})

	// Update transition validation
	const isValidTransition = (fromState: ConnectFlowState, toState: ConnectFlowState): boolean => {
		const currentScreen = SCREENS[fromState]

		if (!currentScreen.next.includes(toState)) {
			return false
		}

		const requiredStore = currentScreen.screenConfig?.requiredStore
		if (requiredStore) {
			return requiredStore.every(key => store.value[key] !== null)
		}

		return true
	}

	// Update navigation methods
	const goNextState = (specificState?: ConnectFlowState) => {
		if (!currentState.value) {
			currentState.value = ConnectFlowState.INITIAL
			return
		}

		const nextState = specificState ?? currentScreen.value?.next[0]
		if (!nextState) {
			throw new Error('No next state found')
		}

		if (!isValidTransition(currentState.value, nextState)) {
			throw new Error(`Invalid transition from ${currentState.value} to ${nextState}`)
		}

		if (!specificState && (currentScreen.value?.next.length ?? 0) === 0) {
			throw new Error('No next state available')
		}

		if (!specificState && (currentScreen.value?.next.length ?? 0) > 1) {
			console.warn('Multiple next states available, using the first one')
		}

		stateHistory.value.push(currentState.value)
		currentState.value = nextState
	}

	const goBackState = () => {
		if (stateHistory.value.length === 0) {
			throw new Error('No history found')
		}
		const previousState = stateHistory.value.pop()
		if (previousState) {
			currentState.value = previousState
		}
	}

	const checkState = (_state: ConnectFlowState) => {
		if (currentState.value !== _state) {
			throw new Error(`Invalid state, expected ${_state} but got ${currentState.value}`)
		}
	}

	return {
		currentState,
		currentScreen,
		stateHistory,
		screenHistory,
		reset,
		goNextState,
		goBackState,
		checkState,
		hasNextButton,
		canGoBack,
		canGoNext,
		store,
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
