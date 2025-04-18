<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Plus, Send, Shield, Wallet } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { useConnectModal } from '@/stores/useConnectModal'
import { useModal } from 'vue-final-modal'
import ConnectModal from '@/components/connect-modal/ConnectModal.vue'
import { useBlockchain } from '@/stores/useBlockchain'
const { chainId } = useBlockchain()

// ============================== Connect Modal ==============================
const connectModalStore = useConnectModal()
const { open: openConnectModal, close: closeConnectModal } = useModal({
	component: ConnectModal,
	attrs: {
		onClose: () => closeConnectModal(),
	},
	slots: {},
})

connectModalStore.updateStore({
	openModal: openConnectModal,
	closeModal: closeConnectModal,
})

function onClickConnectButton() {
	openConnectModal()
	connectModalStore.goNextStage()
}
</script>

<template>
	<div class="flex flex-col items-center justify-center gap-8 py-8">
		<div class="text-center space-y-4">
			<h1 class="text-4xl font-bold tracking-tight">Welcome to Smart Account Manager</h1>
			<p class="text-xl text-muted-foreground max-w-2xl">
				Manage your smart accounts with clarity and efficiency
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-3 w-full max-w-4xl">
			<Card class="flex flex-col">
				<CardHeader>
					<div class="bg-primary/10 p-3 rounded-full w-fit">
						<Send class="h-6 w-6 text-primary" />
					</div>
					<CardTitle class="mt-4">Send</CardTitle>
					<CardDescription>Send tokens and execute transactions with your smart account</CardDescription>
				</CardHeader>
				<CardFooter class="mt-auto pt-4">
					<RouterLink :to="{ name: 'send-token', params: { chainId } }" class="w-full">
						<Button variant="outline" class="w-full">Get Started</Button>
					</RouterLink>
				</CardFooter>
			</Card>

			<Card class="flex flex-col">
				<CardHeader>
					<div class="bg-primary/10 p-3 rounded-full w-fit">
						<Clock class="h-6 w-6 text-primary" />
					</div>
					<CardTitle class="mt-4">Scheduling</CardTitle>
					<CardDescription>Schedule recurring transactions and manage automated tasks</CardDescription>
				</CardHeader>
				<CardFooter class="mt-auto pt-4">
					<RouterLink :to="{ name: 'scheduling-transfer', params: { chainId } }" class="w-full">
						<Button variant="outline" class="w-full">Get Started</Button>
					</RouterLink>
				</CardFooter>
			</Card>

			<Card class="flex flex-col">
				<CardHeader>
					<div class="bg-primary/10 p-3 rounded-full w-fit">
						<Shield class="h-6 w-6 text-primary" />
					</div>
					<CardTitle class="mt-4">Recovery</CardTitle>
					<CardDescription>Set up account recovery mechanisms and secure your assets</CardDescription>
				</CardHeader>
				<CardFooter class="mt-auto pt-4">
					<RouterLink :to="{ name: 'recovery-setup', params: { chainId } }" class="w-full">
						<Button variant="outline" class="w-full">Get Started</Button>
					</RouterLink>
				</CardFooter>
			</Card>
		</div>

		<div class="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-4xl">
			<Button size="lg" class="mt-4 w-full sm:w-auto" @click="onClickConnectButton">
				<Plus class="w-5 h-5 mr-2" />
				Import Existing Account
			</Button>

			<RouterLink :to="{ name: 'create' }" class="w-full sm:w-auto">
				<Button size="lg" variant="outline" class="mt-4 w-full">
					<Wallet class="w-5 h-5 mr-2" />
					Create New Account
				</Button>
			</RouterLink>
		</div>
	</div>
</template>

<style lang="css" scoped></style>
