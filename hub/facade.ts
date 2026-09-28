import {BehaviorSubject, ReplaySubject, Subject} from 'rxjs';
import {nativeMempoolFeeColors} from '@app/app.constants';
import {initialTonPending} from '@app/shared/ton-pending-state';
import {tonBlockIdentityFromUrl, tonBlockUrl, tonHostnameWorkchain} from '@app/ton/chain-selection';

export function nativeDestination(origin: string, route: string): string {
 const url = new URL(route.replace(/\/+/g, '/'), origin);
 const block = tonBlockIdentityFromUrl(url.href);
 if (!block) return url.href;
 const destination = new URL(tonBlockUrl(block, undefined, url.pathname));
 if (block.workchain === tonHostnameWorkchain(new URL(origin).hostname)) return origin + destination.pathname + destination.search;
 return destination.href;
}
export class StateService {
 env={KEEP_BLOCKS_AMOUNT:8,ROOT_NETWORK:'',BASE_MODULE:'mempool',BLOCK_WEIGHT_UNITS:60000000,MEMPOOL_BLOCKS_AMOUNT:8}; network=''; isBrowser=true; blockVSize=15000000; latestBlockHeight=0;
 blocks$=new ReplaySubject<any[]>(1); blocksSubject$=this.blocks$; chainTip$=new ReplaySubject<number>(1);
 mempoolBlocks$=new ReplaySubject<any[]>(1); difficultyAdjustment$=new ReplaySubject<any>(1);
 tonPending$=new BehaviorSubject(initialTonPending());
 blockDisplayMode$=new BehaviorSubject('fees'); timeLtr=new BehaviorSubject(false); connectionState$=new BehaviorSubject(2);
 isLoadingWebSocket$=new BehaviorSubject(true);isLoadingMempool$=new BehaviorSubject(true);
 networkChanged$=new BehaviorSubject('');isTabHidden$=new BehaviorSubject(false);markBlock$=new Subject();txConfirmed$=new Subject(); keyNavigation$=new Subject();blockScrolling$=new BehaviorSubject(false);
 fiatCurrency$=new BehaviorSubject('USD');viewAmountMode$=new BehaviorSubject('btc');conversions$=new BehaviorSubject({});rateUnits$=new BehaviorSubject('sat/vB');
 isLiquid(){return false;}
}
export class CacheService {loadedBlocks$=new Subject();}
export class StorageService {getValue(){return 'fees';}setValue(){}}
export class ThemeService {mempoolFeeColors=nativeMempoolFeeColors;themeState$=new BehaviorSubject({theme:'default',loading:false});}
export class EtaService {mempoolPositionFromFees(){return null;}}
