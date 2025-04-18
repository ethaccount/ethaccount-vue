<script setup lang="ts">
import { fetchAccountId } from '@/lib/aa'
import { useBlockchain } from '@/stores/useBlockchain'
import { ConnectModalStageKey, useConnectModal } from '@/stores/useConnectModal'
import { AccountId } from '@/types'
import { shortenAddress } from '@vue-dapp/core'
import { Contract, EventLog } from 'ethers'
import { Loader2 } from 'lucide-vue-next'
import { ADDRESS } from 'sendop'

interface AccountInfo {
	address: string
	accountId: AccountId | null
	loading: boolean
}

const { store, assertStage, updateStore, goNextStage } = useConnectModal()

assertStage(ConnectModalStageKey.EOA_ACCOUNT_CHOICE)

const accounts = ref<AccountInfo[]>([])
const loading = ref(false)
const loadingAddresses = ref(false)

const { clientNoBatch } = useBlockchain()

onMounted(async () => {
	try {
		loading.value = true
		loadingAddresses.value = true
		if (!store.value.eoaAddress) {
			throw new Error('EOAAccountChoice: !store.value.eoaAddress')
		}

		const addresses = await getAccountsByECDSAValidator(store.value.eoaAddress)
		accounts.value = addresses.map(address => ({
			address,
			accountId: null,
			loading: true,
		}))
		loadingAddresses.value = false

		const accountIdPromises = addresses.map((address, index) =>
			fetchAccountId(address, clientNoBatch.value)
				.then(accountId => {
					accounts.value[index].accountId = accountId
					accounts.value[index].loading = false
				})
				.catch(error => {
					console.error(`Error fetching account ID for ${address}:`, error)
					accounts.value[index].loading = false
				}),
		)

		await Promise.all(accountIdPromises)
	} catch (error) {
		throw error
	} finally {
		loading.value = false
		loadingAddresses.value = false
	}
})

async function getAccountsByECDSAValidator(address: string): Promise<string[]> {
	const ecdsaValidator = new Contract(
		ADDRESS.ECDSAValidator,
		['event OwnerRegistered(address indexed kernel, address indexed owner)'],
		clientNoBatch.value,
	)
	const events = (await ecdsaValidator.queryFilter(
		ecdsaValidator.filters.OwnerRegistered(null, address),
	)) as EventLog[]

	const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber)
	return sortedEvents.slice(0, 5).map(event => event.args[0]) as string[]
}

function onClickAccount(accountInfo: AccountInfo) {
	if (loading.value) {
		return
	}

	updateStore({
		accountId: accountInfo.accountId,
		deployedAddress: accountInfo.address,
	})
	goNextStage()
}
</script>

<template>
	<div>
		<Card>
			<CardContent class="grid px-4 py-2">
				<div class="flex items-center justify-center">
					<Loader2 v-if="loadingAddresses" class="w-4 h-4 mr-2 animate-spin" />
				</div>
				<div v-if="accounts.length === 0" class="text-gray-500 text-center">No accounts found</div>
				<div
					class="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer"
					v-for="account in accounts"
					:key="account.address"
					@click="onClickAccount(account)"
				>
					<div class="space-y-1">
						<p class="text-sm font-medium leading-none">{{ shortenAddress(account.address) }}</p>
						<p class="text-sm text-muted-foreground">
							{{ account.loading ? 'loading...' : account.accountId }}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</template>

<style lang="css"></style>
