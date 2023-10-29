<template>
	<div class="obsbrowsersources">
		<Button icon="refresh"
			class="refreshAllBt"
			@click="refreshAllSource()"
			:loading="refreshingAll">{{ $t("obs.browser_sources_refresh_all") }}</Button>

		<div class="card-item row" v-for="entry in sources" ref="row">
			<p>{{ entry.source.sourceName }}</p>
			<Button :icon="entry.success? 'checkmark' : 'refresh'"
				@click="refreshSource(entry)"
				:primary="entry.success"
				:loading="entry.loading">{{ $t("obs.browser_sources_refresh") }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button
	},
	emits:[],
})
export default class OBSBrowserSources extends Vue {

	public refreshingAll:boolean = false;
	public sources:{loading:boolean, success:boolean, source:OBSSourceItem}[] = [];

	public async mounted():Promise<void> {
		const sources = await OBSWebsocket.instance.getSources(false);
		this.sources = sources
						.filter(v=> v.inputKind == "browser_source")
						.map(v=>{
							return {loading:false, success:false, source:v}
						});

		await this.$nextTick();
		
		const items = this.$refs.row as HTMLDivElement[];
		gsap.from(items, {height:0, scaleY:0, paddingTop:0, marginTop:0, duration:0.25, stagger:0.025, delay:.25, clearProps:"all"});
	}

	public async refreshSource(entry:typeof this.sources[0]):Promise<void> {
		entry.loading = true;
		await OBSWebsocket.instance.socket.call("PressInputPropertiesButton", {inputName:entry.source.sourceName, propertyName:"refreshnocache"});
		await Utils.promisedTimeout(200);
		entry.loading = false;
		entry.success = true;
		Utils.promisedTimeout(1000).then(()=> {
			entry.success = false;
		})
	}

	public async refreshAllSource():Promise<void> {
		this.refreshingAll = true;
		for (let i = 0; i < this.sources.length; i++) {
			await this.refreshSource(this.sources[i]);
		}
		this.refreshingAll = false;
	}

}
</script>

<style scoped lang="less">
.obsbrowsersources{
	gap: .5em;
	display: flex;
	flex-direction: column;
	.refreshAllBt {
		align-self: center;
	}
	.row {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		overflow: hidden;
	}
}
</style>