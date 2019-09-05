import { Observable, Subscription, Subscriber, of, OperatorFunction, PartialObserver, ObservableInput, isObservable, TeardownLogic, Observer } from 'rxjs';
import { RecorderLogLevel } from '../api/recorder-config';
import { flatMap, map, finalize, tap, share, take } from 'rxjs/operators';
import { RecorderConstants } from './recorder-constants';
import { RecorderManagerDefault } from './recorder-manager-default';
import { FieldEtc } from './field-etc';
import { flatMapJustOnceRxOpr, combineFirstSerial, mapJustOnceRxOpr } from './rxjs-util';
import { TypeLike } from '../typeslike';
import { ResponseLike } from '../typeslike';
import { PlayerMetadatas } from '../api/player-metadatas';
import { LazyRef, LazyRefPrpMarker } from '../api/lazy-ref';
import { GenericNode } from '../api/generic-tokenizer';
import { RecorderSession, OriginalLiteralValueEntry, PlayerSnapshot } from '../api/session';
import { IFieldProcessorEvents } from '../api/field-processor';
import { RecorderSessionImplementor } from './recorder-session-default';
import { RecorderLogger } from '../api/recorder-config';
import { TapeActionType, TapeAction } from '../api/tape';
import { TapeActionDefault } from './tape-default';
import { LodashLike } from './lodash-like';

export class LazyRefImplementor<L extends object, I> extends LazyRef<L, I> {
    /** Framework internal use. */
    setRealResponseDoneDirectRawWrite(value: boolean): void { throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!'); };
    /** Framework internal use. */
    isRealResponseDoneDirectRawWrite(): boolean { throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!'); };
    /** Framework internal use. */
    setLazyObjOnLazyLoading(lazyLoadedObj: L): void { throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!'); };
    /** Framework internal use. */
    setLazyObjNoNext(lazyLoadedObj: L) : void { throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!'); };
    /** Framework internal use. */
    setLazyObjOnLazyLoadingNoNext(lazyLoadedObj: L) : void { throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!'); };
    /** Framework internal use. */
    notifyModification(lazyLoadedObj: L) : void { throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!'); };
    /** 
     * TODO:  
     * Framework internal use.
     */
    processResponse(responselike: ResponseLike<PlayerSnapshot | NodeJS.ReadStream>):  L | Observable<L> { throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!'); };
    /** Framework internal use. */
    get genericNode(): GenericNode {
		throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
    set genericNode(value: GenericNode) {
		throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
	public get refererObj(): any {
		throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
	public set refererObj(value: any) {
		throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
	public get refererKey(): string {
		throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
	public set refererKey(value: string) {
		throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
	public get session(): RecorderSession {
		throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
	public set session(value: RecorderSession) {
		throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
	public get lazyLoadedObj(): L {
		throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
    public get respObs(): Observable<ResponseLike<Object>> {
        throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
    public set respObs(value: Observable<ResponseLike<Object>>) {
        throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }
    /** Framework internal use. */
    public get fieldProcessorEvents(): IFieldProcessorEvents<L> {
        throw new Error('LazyRef is not the real implementation base, Do not instantiate it!!');
    }

    public toString(): string {
        let thisLocal = this;
        return JSON.stringify(
            {
                instanceId: (thisLocal as any).instanceId,
                iAmLazyRef: thisLocal.iAmLazyRef,
                refererKey: thisLocal.refererKey,
                refererObj:
                    thisLocal.refererObj
                        && thisLocal.refererObj.constructor
                        && thisLocal.refererObj.constructor.name ?
                    thisLocal.refererObj.constructor.name
                    : null,
                "isLazyLoaded()": thisLocal.isLazyLoaded(),
                genericNode: thisLocal.genericNode? thisLocal.genericNode.toString(): null,
                signatureStr: thisLocal.signatureStr
            },
            null,
            2);
    }
}

/**
 * Default implementation!  
 * See {@link LazyRef}
 */
export class LazyRefDefault<L extends object, I> extends LazyRefImplementor<L, I> {

    private notificationStartTime: number = Date.now();
    private notificationCount: number = 0;

    private _instanceId: number;
	public get instanceId(): number {
		return this._instanceId;
	}
	public set instanceId(value: number) {
		this._instanceId = value;
	}

    private _playerObjectId: I;
    private _lazyLoadedObj: L;
    private _genericNode: GenericNode;
    private _signatureStr: string;
    private _respObs: Observable<ResponseLike<Object>>;
    private _refererObj: any;
    private _refererKey: string;
    private _session: RecorderSessionImplementor;

    constructor(session: RecorderSessionImplementor) {
        super();
        const thisLocal = this;
        this._session = session;
        thisLocal.consoleLike = this.session.manager.config.getConsole(RecorderLogger.LazyRef);
        thisLocal.consoleLikeProcResp = this.session.manager.config.getConsole(RecorderLogger.LazyRefBaseProcessResponse);
        thisLocal.consoleLikeSubs = this.session.manager.config.getConsole(RecorderLogger.LazyRefSubscribe);
        this._lazyLoadedObj = null;
    }

    private _isRealResponseDoneDirectRawWrite = false;
    isRealResponseDoneDirectRawWrite(): boolean { 
        return this._isRealResponseDoneDirectRawWrite;
    };
    setRealResponseDoneDirectRawWrite(value: boolean): void {
        this._isRealResponseDoneDirectRawWrite = value;
    };

    private _isOnLazyLoading: boolean = false;
    private flatMapKeepAllFlagsRxOprPriv<T, R>(
        when: 'justOnce' | 'eachPipe',
        project: (value: T, index?: number) => ObservableInput<R>,
        concurrent?: number): OperatorFunction<T, R> {
        const thisLocal = this;
        const syncIsOn = thisLocal._isOnLazyLoading;
        const syncIsOn2 = this._needCallNextOnSetLazyObj;
        const isPipedCallbackDone = { value: false, result: null as ObservableInput<R> };
        let newOp: OperatorFunction<T, R> = (source) => {
            let projectExtentend = (value: T, index: number) => {
                if (!isPipedCallbackDone.value || when === 'eachPipe') {
                    isPipedCallbackDone.value = true;

                    const asyncIsOn = thisLocal._isOnLazyLoading;
                    const asyncIsOn2 = thisLocal._needCallNextOnSetLazyObj;

                    thisLocal._isOnLazyLoading = syncIsOn;
                    thisLocal._needCallNextOnSetLazyObj = syncIsOn2;
                    try {
                        isPipedCallbackDone.result = project(value, index);
                    } finally {
                        thisLocal._isOnLazyLoading = asyncIsOn;
                        thisLocal._needCallNextOnSetLazyObj = asyncIsOn2;
                    }
                }
                return isPipedCallbackDone.result;
            };
            return source
                .pipe(
                    flatMap(projectExtentend, concurrent)
                );
        }

        return newOp;
    }
    private flatMapKeepAllFlagsRxOpr<T, R>(project: (value: T, index?: number) => ObservableInput<R>, concurrent?: number): OperatorFunction<T, R> {
        return this.flatMapKeepAllFlagsRxOprPriv('eachPipe', project);
    }
    private flatMapJustOnceKeepAllFlagsRxOpr<T, R>(project: (value: T, index?: number) => ObservableInput<R>,
    concurrent?: number): OperatorFunction<T, R> {
        return this.flatMapKeepAllFlagsRxOprPriv('justOnce', project);
    }

    private mapKeepAllFlagsRxOprHelper<T, R>(when: 'justOnce' | 'eachPipe', project: (value: T, index?: number) => R, thisArg?: any): OperatorFunction<T, R> {
        const thisLocal = this;
        const syncIsOn = this._isOnLazyLoading;
        const syncIsOn2 = this._needCallNextOnSetLazyObj;
        const isPipedCallbackDone = { value: false, result: null as R};
        let newOp: OperatorFunction<T, R> = (source) => {
            let projectExtentend = (value: T, index: number) => {
                if (!isPipedCallbackDone.value || when === 'eachPipe') {
                    isPipedCallbackDone.value = true;
                    const asyncIsOn = thisLocal._isOnLazyLoading;
                    const asyncIsOn2 = thisLocal._needCallNextOnSetLazyObj;
                    thisLocal._isOnLazyLoading = syncIsOn;
                    thisLocal._needCallNextOnSetLazyObj = syncIsOn2;
                    try {
                        isPipedCallbackDone.result = project(value, index);
                    } finally {
                        thisLocal._isOnLazyLoading = asyncIsOn;
                        thisLocal._needCallNextOnSetLazyObj = asyncIsOn2;
                    }
                }
                return isPipedCallbackDone.result;
            }
            return source
                .pipe(
                    map(projectExtentend)
                );

        }

        return newOp;
    }
    private mapKeepAllFlagsRxOpr<T, R>(project: (value: T, index?: number) => R, thisArg?: any): OperatorFunction<T, R> {
        return this.mapKeepAllFlagsRxOprHelper('eachPipe', project);
    }
    private mapJustOnceKeepAllFlagsRxOpr<T, R>(project: (value: T, index?: number) => R, thisArg?: any): OperatorFunction<T, R> {
        return this.mapKeepAllFlagsRxOprHelper('justOnce', project);
    }

    public setLazyObjOnLazyLoading(lazyLoadedObj: L): void {
        const thisLocal = this;
        this.lazyLoadingCallbackTemplate( () => {
            thisLocal.setLazyObj(lazyLoadedObj);
        });
    }

    public isLazyLoaded(): boolean { 
        return this.respObs == null && this.lazyLoadedObj != null;
    };

    private _needCallNextOnSetLazyObj: boolean = true;

    public setLazyObjOnLazyLoadingNoNext(lazyLoadedObj: L): void {
        const thisLocal = this;
        this.noNextCallbackTemplate(() => {
            return this.lazyLoadingCallbackTemplate(() => {
                thisLocal.setLazyObj(lazyLoadedObj);
            });
        });
    }

    public setLazyObjNoNext(lazyLoadedObj: L): void {
        const thisLocal = this;
        this.noNextCallbackTemplate(() => {
            thisLocal.setLazyObj(lazyLoadedObj);
        });
    }

    public notifyModification(lazyLoadedObj: L) : void {
        this.notificationCount++;
        let currentLazyRefNotificationTimeMeasurement = Date.now() - this.notificationStartTime;
        if (currentLazyRefNotificationTimeMeasurement > this.session.manager.config.lazyRefNotificationTimeMeasurement 
                ||this.notificationCount > this.session.manager.config.lazyRefNotificationCountMeasurement) {
            let speedPerSecond = (this.notificationCount / currentLazyRefNotificationTimeMeasurement) * 1000;
            this.notificationStartTime = Date.now();
            this.notificationCount = 0;
            if (speedPerSecond > this.session.manager.config.maxLazyRefNotificationPerSecond) {
                throw new Error('Max notications per second exceded: ' +
                    speedPerSecond + '. Are you modifing any persistent '+
                    'entity or collection on subscribe() instead of '+
                    'subscribeToModify() or '+
                    'is IConfig.maxLazyRefNotificationPerSecond, '+
                    this.session.manager.config.maxLazyRefNotificationPerSecond +
                    ', misconfigured? Me:\n' +
                    this);
            }
        }
        this.nextPriv(true, lazyLoadedObj);
    }

    private processResponseOnLazyLoading(responselike: { body: any }):  L | Observable<L>  {
        const thisLocal = this;
        return this.lazyLoadingCallbackTemplate(() => {
            return thisLocal.processResponse(responselike);
        });
    }

    private lazyLoadingCallbackTemplate<R>(callback: () => R): R {
        try {
            this._isOnLazyLoading = true;
            return callback();
        } finally {
            this._isOnLazyLoading = false;
        }
    }
    
    private noNextCallbackTemplate<R>(callback: () => R): R {
        try {
            this._needCallNextOnSetLazyObj = false;
            return callback();
        } finally {
            this._needCallNextOnSetLazyObj = true;
        }
    }

    public setLazyObj(lazyLoadedObj: L): void {
        const thisLocal = this;
        //const asyncCombineObsArr: Observable<any>[] = [];
        let fieldEtc = RecorderManagerDefault.resolveFieldProcessorPropOptsEtc<L, any>(this.session.fielEtcCacheMap, this.refererObj, this.refererKey, this.session.manager.config);
        if (!fieldEtc.propertyOptions){
            throw new Error('@RecorderDecorators.property() not defined for ' + this.refererObj.constructor.name + '.' + this.refererKey);
        }
        //Validating
        if (!this.refererObj || !this.refererKey) {
            throw new Error('The property \'' + this.refererKey + ' has no refererObj or refererKey' + '. Me:\n' + this);
        }
        if (fieldEtc.prpGenType == null) {
            throw new Error('The property \'' + this.refererKey + ' from \'' + this.refererObj.constructor.name + '\' is not decorated with com \'@Reflect.metadata("design:generics", GenericTokenizer\'...' + '. Me:\n' + this);
        }
        if (fieldEtc.prpGenType.gType !== LazyRef && fieldEtc.prpGenType.gType !== LazyRefPrpMarker) {
            throw new Error('The property \'' + this.refererKey + ' from \'' + this.refererObj.constructor.name + '\' is not LazyRef. Me:\n' + this);
        }
        if ((fieldEtc.otmCollectionType === Set || fieldEtc.otmCollectionType === Array) && !this._isOnLazyLoading) {
            throw new Error('The property \'' + this.refererKey + ' from \'' + this.refererObj.constructor.name + '\' can not be changed because this is a collection: \'' + fieldEtc.otmCollectionType.name + '\'' + '. Me:\n' + this);
        }

        //null to response.
        this.respObs = null;
        const isValueByFieldProcessor: {value: boolean} = { value: false };

        if (!this.session.isOnRestoreEntireStateFromLiteral() && !this._isOnLazyLoading) {
            if (!this.session.isRecording()) {
                throw new Error('Invalid operation. It is not recording. Is this Error correct?! Me:\n' + this);
            }
            if (this.lazyLoadedObj !== lazyLoadedObj) {
                if (thisLocal.consoleLike.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLike.group('LazyRefDefault.setLazyObj()' +
                        '(this.lazyLoadedObj === lazyLoadedObj)\n' +
                        'NOT recording action: ' + TapeActionType.SetField + '. actual and new value: ');
                    thisLocal.consoleLike.debug(this.lazyLoadedObj);
                    thisLocal.consoleLike.debug(lazyLoadedObj);
                    thisLocal.consoleLike.groupEnd();
                }

                let mdRefererObj = this.bMdRefererObj;
                let mdLazyLoadedObj = this.bMdLazyLoadedObj;

                //recording tape
                const action: TapeAction = new TapeActionDefault();
                action.fieldName = this.refererKey;
                action.actionType = TapeActionType.SetField;
                action.attachRefId = thisLocal.attachRefId;
                if (mdRefererObj.$signature$) {
                    action.ownerSignatureStr = mdRefererObj.$signature$;
                } else if (LodashLike.has(this.refererObj, this.session.manager.config.creationIdName)) {
                    action.ownerCreationRefId = LodashLike.get(this.refererObj, this.session.manager.config.creationIdName) as number;
                } else if (!this._isOnLazyLoading && !mdRefererObj.$isComponentPlayerObjectId$) {
                    throw new Error('The property \'' + this.refererKey + ' from \'' + this.refererObj.constructor.name + '\' has a not managed owner. Me:\n' + this);
                }

                if (lazyLoadedObj != null) {
                    if (mdLazyLoadedObj.$signature$) {
                        action.settedSignatureStr = mdLazyLoadedObj.$signature$;
                    } else if (LodashLike.has(lazyLoadedObj, this.session.manager.config.creationIdName)) {
                        action.settedCreationRefId = LodashLike.get(lazyLoadedObj, this.session.manager.config.creationIdName) as number;
                    } else if (fieldEtc.lazyRefMarkerType === LazyRefPrpMarker) {
                        //nothing for now!
                    } else if (!this._isOnLazyLoading) {
                        throw new Error('The property \'' + this.refererKey + ' from \'' + this.refererObj.constructor.name + '\'.  lazyLoadedObj is not managed: \'' + lazyLoadedObj.constructor.name + '\'' + '. Me:\n' + this);
                    }
                }

                if (fieldEtc.lazyRefMarkerType === LazyRefPrpMarker) {
                    if (fieldEtc.propertyOptions.lazyDirectRawWrite) {
                        isValueByFieldProcessor.value = true;
                        let processTapeActionAttachRefId$ = thisLocal.session.processTapeActionAttachRefId({fieldEtc: fieldEtc, value: lazyLoadedObj, action: action, propertyKey: thisLocal.refererKey});
                        //processTapeActionAttachRefId$ = processTapeActionAttachRefId$.pipe(thisLocal.session.addSubscribedObsRxOpr());
                        processTapeActionAttachRefId$ = processTapeActionAttachRefId$.pipe(
                            thisLocal.mapJustOnceKeepAllFlagsRxOpr((ptaariValue) => {
                                if(!ptaariValue.asyncAddTapeAction) {
                                    thisLocal.session.addTapeAction(action);
                                }
                                if (thisLocal.attachRefId !== action.attachRefId) {
                                    throw new Error('This should not happen');
                                }
                                
                                this.mayDoNextHelper(isValueByFieldProcessor, fieldEtc, ptaariValue.newValue);
                                return ptaariValue;
                            }),
                            thisLocal.session.registerProvidedObservablesRxOpr()
                        );
                        const subs = processTapeActionAttachRefId$.subscribe(() => {
                            if(subs) {
                                subs.unsubscribe();
                            }
                        });

                        thisLocal._lazyLoadedObj = null;
                        thisLocal.respObs = of(null).pipe(
                            flatMap(() => {
                                return thisLocal.session.manager.config.cacheHandler.getFromCache(thisLocal.attachRefId);
                            }),
                            map((stream) => {
                                return { body: stream };
                            })
                        );
                        //asyncCombineObsArr.push(processTapeActionAttachRefId$);
                    } else if (fieldEtc.fieldProcessorCaller && fieldEtc.fieldProcessorCaller.callToLiteralValue) {
                        isValueByFieldProcessor.value = true;
                        let toLiteralValue$ = fieldEtc.fieldProcessorCaller.callToLiteralValue(action.simpleSettedValue, fieldEtc.fieldInfo);
                        // toLiteralValue$ = toLiteralValue$.pipe(this.session.addSubscribedObsRxOpr());
                        toLiteralValue$ = toLiteralValue$.pipe(
                            tap(
                                {
                                    next: value => {
                                        action.simpleSettedValue = value;
                                        thisLocal.session.addTapeAction(action);
                                    }
                                }
                            ),
                            thisLocal.session.registerProvidedObservablesRxOpr(),
                            share()
                        );
                        //asyncCombineObsArr.push(toLiteralValue$);
                    } else {
                        this.session.addTapeAction(action);
                    }
                }
            } else {
                if (thisLocal.consoleLike.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLike.group('LazyRefDefault.setLazyObj()' +
                        '(this.lazyLoadedObj !== lazyLoadedObj)\n'+
                        'Recording action: ' + TapeActionType.SetField + '. value: ');
                    thisLocal.consoleLike.debug(lazyLoadedObj);
                    thisLocal.consoleLike.groupEnd();
                }
            }
        }

        if (!isValueByFieldProcessor.value && fieldEtc.prpGenType.gType !== LazyRefPrpMarker) {
            if (this.lazyLoadedObj !== lazyLoadedObj) {
                if (this.lazyLoadedObj) {
                    this.session.unregisterEntityAndLazyref(this.lazyLoadedObj, this);
                }
            }
        } else {
        }
        this.mayDoNextHelper(isValueByFieldProcessor, fieldEtc, lazyLoadedObj);
    }

    private mayDoNextHelper(isValueByFieldProcessor: {value: boolean}, fieldEtc: FieldEtc<L, any>, newLazyLoadedObj: L) {
        const thisLocal = this;
        if (newLazyLoadedObj !== thisLocal._lazyLoadedObj) {
            thisLocal._lazyLoadedObj = newLazyLoadedObj;
            if (!isValueByFieldProcessor.value && fieldEtc.prpGenType.gType !== LazyRefPrpMarker) {
                if (thisLocal.lazyLoadedObj) {
                    thisLocal.session.registerEntityAndLazyref(thisLocal.lazyLoadedObj, thisLocal);
                }
            }

            if (thisLocal._needCallNextOnSetLazyObj) {
                thisLocal.nextPriv(true, thisLocal.lazyLoadedObj);
            }
        }
    }

    asObservable(): Observable<L> {
        const thisLocal = this;
        let fieldEtc = RecorderManagerDefault.resolveFieldProcessorPropOptsEtc<L, any>(this.session.fielEtcCacheMap, this.refererObj, this.refererKey, this.session.manager.config);
        if (!fieldEtc.propertyOptions.lazyDirectRawWrite) {
            return super.asObservable();
        } else {
            //providing new readable (flipped) NodeJS.ReadableStream from cache
            //this.respObs is never null
            if (!fieldEtc.propertyOptions.lazyDirectRawWrite) {
                throw new Error('LazyRefBase.subscribe: thisLocal.attachRefId is not null but this is not lazyDirectRawWrite. Me:\n' +
                    this);
            }
            let localObs$ = thisLocal.respObs;
            const localObsL$ = (localObs$ as Observable<ResponseLike<NodeJS.ReadableStream>>).pipe(
                thisLocal.flatMapKeepAllFlagsRxOpr((respLikeStream) => {
                    const processResponseOnLazyLoading = thisLocal.processResponseOnLazyLoading(respLikeStream);
                    if (isObservable(processResponseOnLazyLoading)) {
                        const processResponseOnLazyLoading$ = processResponseOnLazyLoading as Observable<L>;
                        return processResponseOnLazyLoading$;
                    } else {
                        return this.thrownError(new Error('This should not happen soud not happen.This LazyRef is lazyDirectRawWrite'));
                    }
                }),
                //thisLocal.session.registerLazyRefSubscriptionRxOpr(thisLocal.signatureStr),
                thisLocal.session.registerProvidedObservablesRxOpr(),
                tap(
                    {
                        next: (valueL: L) => {
                            if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                                thisLocal.consoleLikeSubs.group('(Asynchronous of Asynchronous of...) LazyRef.subscribe() => getFromCache$.subscribe() => fromDirectRaw$.subscribe() => setLazyObjOnLazyLoading$.pipe(tap()).');
                                thisLocal.consoleLikeSubs.debug('calling this.next(). attachRefId is not null. Am I using lazyDirectRawWrite? Me:\n' + thisLocal.session.jsonStringfyWithMax(thisLocal));
                                thisLocal.consoleLikeSubs.groupEnd();
                            }
                        }
                    }
                ),
                share(),
            );
            return localObsL$;
        }
    }

    private DummyCurrNextValueClass = class {};
    private readonly dummyCurrtNextValueInstance: L = new this.DummyCurrNextValueClass() as L;

    private currNextValue: L = this.dummyCurrtNextValueInstance;
    private firstSubscribeOcurrence = true;
    /**
     * Do super.next only if is the first subscribe ocurred or is the value  
     * is diferent from the last value or is forceSuper.
     * @param forceSuper 
     * @param value 
     */
    private nextPriv(forceSuper: boolean, value?: L): void {
        if (this.firstSubscribeOcurrence) {
            this.next(value);
        } else if (value !== this.currNextValue) {
            this.next(value);
        } else {
            if (forceSuper) {
                this.next(value);
            }
        }
    }

    next(value?: L): void {
        this.firstSubscribeOcurrence = false;
        this.currNextValue = value;
        super.next(value);
    }

    subscribe(observerOrNext?: PartialObserver<L> | ((value: L) => void),
        error?: (error: any) => void,
        complete?: () => void): Subscription {
        const thisLocal = this;

        let resultSubs: Subscription = null;
        let fieldEtc = RecorderManagerDefault.resolveFieldProcessorPropOptsEtc<L, any>(this.session.fielEtcCacheMap, this.refererObj, this.refererKey, this.session.manager.config);
        if (!fieldEtc.propertyOptions.lazyDirectRawWrite) {
            //super.subscribe() only for non lazyDirectRawWrite
            if (observerOrNext instanceof Subscriber) {
                resultSubs = super.subscribe(observerOrNext);
            } else {
                resultSubs = super.subscribe(<(value: L) => void>observerOrNext, error, complete);
            }
        }
        let observerOriginal: PartialObserver<L>;
        if ((observerOrNext as PartialObserver<L>).next
            || (observerOrNext as PartialObserver<L>).complete
            || (observerOrNext as PartialObserver<L>).error
            || (observerOrNext as PartialObserver<L>).next) {
            if (error || complete) {
                throw new Error('observerOrNext is a PartialObserver and error or complete are passed as parameter');
            }
            observerOriginal = observerOrNext as PartialObserver<L>;
        } else {
            observerOriginal = {
                next: observerOrNext as (value: L) => void,
                error: error,
                complete: complete
            }
        }
        let observerNew: PartialObserver<L> = {...observerOriginal};

        const thisLocalNextOnAsync = {value: false};

        if (thisLocal.lazyLoadedObj == null) {
            if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                thisLocal.consoleLikeSubs.debug(
                    '(thisLocal.lazyLoadedObj == null)\n'
                    +'It may mean that we have not subscribed yet in the Observable of Response');
            }
            if (this.respObs == null) {
                if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeSubs.debug(
                        '(this.respObs == null)\n'
                        +'Means that we already subscribed to an earlier moment in the Observable of Reponse.\n'
                        +'We will simply call the super.subscribe and call  next()');
                }
            } else if (this.session.getCachedBySignature(this.signatureStr)) {
                if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeSubs.debug(
                        '(this.lazyLoadedObj == null && this.respObs != null && this.session.getCachedBySignature(this.signatureStr)\n'
                        +'Means that we already loaded this object by signature with another lazyRef.\n'
                        +'We will get from session signature cache call next()');
                }
                thisLocalNextOnAsync.value = true;
                thisLocal.setLazyObjOnLazyLoading(<L> this.session.getCachedBySignature(this.signatureStr));
                if (!observerNew.closed) {
                    observerNew.closed = true;
                    if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeSubs.group('(Asynchronous of Asynchronous of...) LazyRef.subscribe() => setLazyObjOnLazyLoading$.pipe(tap()). !observerNew.closed');
                        thisLocal.consoleLikeSubs.debug('calling this.next()'); thisLocal.consoleLikeSubs.debug(thisLocal.lazyLoadedObj);
                        thisLocal.consoleLikeSubs.groupEnd();
                    }
                    //here the original method will be called
                    thisLocal.respObs = null;
                    thisLocal.nextPriv(false, thisLocal.lazyLoadedObj);
                } else {
                    if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeSubs.group('(Asynchronous of Asynchronous of...) LazyRef.subscribe() => setLazyObjOnLazyLoading$.pipe(tap()). observerNew.closed');
                        thisLocal.consoleLikeSubs.debug('NOT calling this.next()'); thisLocal.consoleLikeSubs.debug(thisLocal.lazyLoadedObj);
                        thisLocal.consoleLikeSubs.groupEnd();
                    }
                }
            } else if (fieldEtc.propertyOptions.lazyDirectRawWrite) {
                //lazyDirectRawWrite is always readed from cache.
                return this.asObservable().subscribe(observerOriginal as any, error, complete);
            } else {
                if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeSubs.debug(
                        '(thisLocal.respObs != null)\n'
                        +'Means that we are not subscribed yet in the Observable of Reponse.\n'
                        +'this.respObs will be null after subscription, so we mark that '
                        +'there is already an inscription in the Response Observable, and we '+
                        'will not make two trips to the server');
                }
                //return thisLocal.processResponseOnLazyLoading(response);
                let localObs$: Observable<L> = 
                    thisLocal.respObs.pipe(
                        thisLocal.session.logRxOpr('LazyRef_subscribe_respObs'),
                        thisLocal.mapJustOnceKeepAllFlagsRxOpr((responseLike) => {
                            const processResponseOnLazyLoading = thisLocal.processResponseOnLazyLoading(responseLike);
                            return processResponseOnLazyLoading as L;
                        })
                    );

                thisLocalNextOnAsync.value = true;
                observerNew.next = (value: L) => {
                    if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                        thisLocal.consoleLikeSubs.group('(Asynchronous of Asynchronous of...) LazyRef.subscribe() => observerNew.next()');
                        thisLocal.consoleLikeSubs.debug(thisLocal.lazyLoadedObj);
                        thisLocal.consoleLikeSubs.groupEnd();
                    }

                    thisLocal.setLazyObjOnLazyLoadingNoNext(value);

                    if (!observerNew.closed) {
                        if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                            thisLocal.consoleLikeSubs.group('(Asynchronous of Asynchronous of...) LazyRef.subscribe() => getFromCache$.subscribe() => fromDirectRaw$.subscribe() => setLazyObjOnLazyLoading$.pipe(tap()). !observerNew.closed');
                            thisLocal.consoleLikeSubs.debug('calling this.next()'); thisLocal.consoleLikeSubs.debug(thisLocal.lazyLoadedObj);
                            thisLocal.consoleLikeSubs.groupEnd();
                        }
                        observerNew.closed = true;
                        //here the original method will be called
                        thisLocal.nextPriv(false, thisLocal.lazyLoadedObj);
                    } else {
                        if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                            thisLocal.consoleLikeSubs.group('(Asynchronous of Asynchronous of...) LazyRef.subscribe() => getFromCache$.subscribe() => fromDirectRaw$.subscribe() => setLazyObjOnLazyLoading$.pipe(tap()). observerNew.closed');
                            thisLocal.consoleLikeSubs.debug('NOT calling this.next()'); thisLocal.consoleLikeSubs.debug(thisLocal.lazyLoadedObj);
                            thisLocal.consoleLikeSubs.groupEnd();
                        }
                    }
                }

                thisLocalNextOnAsync.value = true;
                localObs$ = localObs$.pipe(
                    thisLocal.session.registerLazyRefSubscriptionRxOpr(thisLocal.signatureStr),
                    thisLocal.session.registerProvidedObservablesRxOpr(),
                    tap(() => {
                        //so we will mark that you already hear an entry in the Response Observable, and we will not make two trips to the server.
                        //lazyDirectRawWrite is always readed from cache.
                        if (!fieldEtc.propertyOptions.lazyDirectRawWrite) {
                            thisLocal.respObs = null;
                        }
                    }),
                    share()
                );
                localObs$.subscribe(observerNew);
            }
        } else {
            if (fieldEtc.prpGenType.gType === LazyRefPrpMarker && fieldEtc.propertyOptions.lazyDirectRawRead) {
                //providing new readable (flipped) NodeJS.ReadableStream from cache
                if (thisLocal.attachRefId) {
                    throw new Error('LazyRefBase.subscribe: thisLocal.attachRefId must be null when this.lazyLoadedObj is not null. Me:\n' +
                        this);
                }
                thisLocalNextOnAsync.value = true;
                let getFromCache$ = this.session.manager.config.cacheHandler.getFromCache(this.attachRefId);

                let fromDirectRaw$: Observable<ResponseLike<L>> =
                    getFromCache$
                        .pipe(
                            flatMapJustOnceRxOpr((stream) => {
                                return fieldEtc.fieldProcessorCaller.callFromDirectRaw(
                                    of(
                                        {
                                            body: stream,
                                        }
                                    ),
                                    fieldEtc.fieldInfo);
                            }),
                            map((respL) => {
                                return respL;
                            })
                        );
                // fromDirectRaw$ = fromDirectRaw$.pipe(thisLocal.session.addSubscribedObsRxOpr());
                fromDirectRaw$ = fromDirectRaw$.pipe(
                    tap(
                        {
                            next: (repValue: ResponseLike<L>) => {
                                thisLocal.setLazyObjOnLazyLoadingNoNext(repValue.body);
                                if (!observerNew.closed) {
                                    if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                                        thisLocal.consoleLikeSubs.group('(Asynchronous of Asynchronous of...) LazyRef.subscribe() => getFromCache$.subscribe() => fromDirectRaw$.subscribe() => setLazyObjOnLazyLoading$.pipe(tap()). !observerNew.closed');
                                        thisLocal.consoleLikeSubs.debug('calling this.next()'); thisLocal.consoleLikeSubs.debug(thisLocal.lazyLoadedObj);
                                        thisLocal.consoleLikeSubs.groupEnd();
                                    }
                                    observerNew.closed = true;
                                    thisLocal.nextPriv(true, thisLocal.lazyLoadedObj);
                                } else {
                                    if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                                        thisLocal.consoleLikeSubs.group('(Asynchronous of Asynchronous of...) LazyRef.subscribe() => getFromCache$.subscribe() => fromDirectRaw$.subscribe() => setLazyObjOnLazyLoading$.pipe(tap()). observerNew.closed');
                                        thisLocal.consoleLikeSubs.debug('NOT calling this.next()'); thisLocal.consoleLikeSubs.debug(thisLocal.lazyLoadedObj);
                                        thisLocal.consoleLikeSubs.groupEnd();
                                    }
                                }
                            },
                            error: observerNew.error,
                            complete: observerNew.complete,
                            closed: observerNew.closed
                        }
                    )
                );
                fromDirectRaw$ = fromDirectRaw$.pipe(
                    thisLocal.session.registerProvidedObservablesRxOpr(),
                    take(1)
                );
                fromDirectRaw$.subscribe((respValue) => {
                    //thisLocal.nextPriv(respValue.body);
                    //nothing
                })
            }
        }

        if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
            thisLocal.consoleLikeSubs.debug(
                '(thisLocal.lazyLoadedObj != null)\n'
                +'It may mean that we already have subscribed yet in the Observable of Response\n '
                +'or this was created with lazyLoadedObj already loaded.');
        }
        if (!observerNew.closed && !thisLocalNextOnAsync.value) {
            thisLocal.nextPriv(false, thisLocal.lazyLoadedObj);
        }

        return resultSubs;
    }

    private subscriptionToChange: Subscription;

    private subscriptionToChangeUnsubscribe() {
        const thisLocal = this;
        if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
            thisLocal.consoleLikeSubs.debug('LazyRefBase: unsubscribe after this.subscribeToChange. Me\n' + this);
        }
        this.subscriptionToChange.unsubscribe();
        this.session.notifyAllLazyrefsAboutEntityModification(this.lazyLoadedObj, this);
    }


    private firstPutOnCacheRef = {value: undefined as Observable<void>};
    public processResponse(responselike: ResponseLike<PlayerSnapshot | NodeJS.ReadStream>): L | Observable<L> {
        const thisLocal = this;
        //const asyncCombineObsArr: Observable<any>[] = [];
        let lazyLoadedObj$: Observable<L>;
        let isLazyRefOfCollection = false;
        let mdRefererObj: PlayerMetadatas = { $iAmPlayerMetadatas$: true };
        let fieldEtc = RecorderManagerDefault.resolveFieldProcessorPropOptsEtc<L, any>(this.session.fielEtcCacheMap, this.refererObj, this.refererKey, this.session.manager.config);
        if (!fieldEtc.propertyOptions.lazyDirectRawWrite) {
            thisLocal.session.validatePlayerSideResponseLike(responselike);
        }
        let playerSnapshot: PlayerSnapshot | NodeJS.ReadStream;
        playerSnapshot = responselike.body;
        if (LodashLike.has(this.refererObj, this.session.manager.config.playerMetadatasName)) {
            mdRefererObj = LodashLike.get(this.refererObj, this.session.manager.config.playerMetadatasName);
        }

        let originalValueEntry: OriginalLiteralValueEntry;

        let isResponseBodyStream = fieldEtc.propertyOptions.lazyDirectRawWrite
            || ((responselike.body as NodeJS.ReadableStream).pipe && (responselike.body as NodeJS.ReadableStream));
        if (this.lazyLoadedObj == null) {
            let allRespMD = thisLocal.session.resolveMetadatas({literalObject: responselike});
            if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: LazyRef.lazyLoadedObj is not setted yet: Me:\n' + this);
            }
            if (this.genericNode.gType !== LazyRef && this.genericNode.gType !== LazyRefPrpMarker) {
                throw new Error('Wrong type: ' + this.genericNode.gType.name + '. Me:\n' + this);
            }
            if (fieldEtc.otmCollectionType) {
                isLazyRefOfCollection = true;
                if (!(this.genericNode instanceof GenericNode) || (<GenericNode>this.genericNode.gParams[0]).gParams.length <=0) {
                    throw new Error('LazyRef not defined: \'' + this.refererKey + '\' of ' + this.refererObj.constructor.name + '. Me:\n' + this);
                }
                if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: LazyRef is collection: ' + fieldEtc.lazyLoadedObjType.name);
                }
                let collTypeParam: TypeLike<any> =  null;
                if ((<GenericNode>this.genericNode.gParams[0]).gParams[0] instanceof GenericNode) {
                    collTypeParam = (<GenericNode>(<GenericNode>this.genericNode.gParams[0]).gParams[0]).gType;
                } else {
                    collTypeParam = <TypeLike<any>>(<GenericNode>this.genericNode.gParams[0]).gParams[0];
                }
                if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: LazyRef is collection of: ' + collTypeParam.name);
                }

                let lazyLoadedColl: any = this.session.createCollection(fieldEtc.otmCollectionType, this.refererObj, this.refererKey)
                LodashLike.set(lazyLoadedColl, RecorderConstants.ENTITY_IS_ON_LAZY_LOAD_NAME, true);
                try {
                    this.session.processWrappedSnapshotFieldArrayInternal(collTypeParam, lazyLoadedColl, (playerSnapshot as PlayerSnapshot).wrappedSnapshot as any[]);
                    
                    this.setLazyObjOnLazyLoadingNoNext(lazyLoadedColl);
                } finally {
                    LodashLike.set(this.lazyLoadedObj, RecorderConstants.ENTITY_IS_ON_LAZY_LOAD_NAME, false);
                }
            } else if (fieldEtc.lazyRefMarkerType === LazyRefPrpMarker && fieldEtc.propertyOptions.lazyDirectRawRead && isResponseBodyStream) {
                if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: LazyRefPrp is "lazyDirectRawRead". Me:\n' + this);
                }
                if (!isResponseBodyStream) {
                    throw new Error('LazyRefBase.processResponse: LazyRefPrp is "lazyDirectRawRead" but "responselike.body" is not a NodeJS.ReadableStream. Me:\n' +
                        this + '\nresponselike.body.constructor.name: ' +
                        (responselike && responselike.body && responselike.body.constructor.name? responselike.body.constructor.name: 'null'));
                }
                if (fieldEtc.propertyOptions.lazyDirectRawWrite) {
                    thisLocal._lazyLoadedObj = null;
                    //setting next respObs
                    if (!LodashLike.isNil(responselike.body)) {
                        thisLocal.respObs = of(null).pipe(
                            flatMap(() => {
                                return thisLocal.firstPutOnCacheRef.value?
                                    thisLocal.firstPutOnCacheRef.value :
                                    of(null);
                            }),
                            flatMap(() => {
                                return thisLocal.session.manager.config.cacheHandler.getFromCache(thisLocal.attachRefId);
                            }),
                            map((stream) => {
                                return { body: stream};
                            })
                        );
                    } else {
                        thisLocal.firstPutOnCacheRef.value = undefined;
                        thisLocal.setRealResponseDoneDirectRawWrite(true);
                        thisLocal.respObs = of({ body: null });
                    }

                    let putOnCache$: Observable<void>;
                    const isRealResponseDoneDirectRawWriteLocal = thisLocal.isRealResponseDoneDirectRawWrite();
                    if (!isRealResponseDoneDirectRawWriteLocal) {
                        thisLocal.attachRefId = this.session.manager.config.cacheStoragePrefix + this.session.nextMultiPurposeInstanceId().toString();
                        if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                            thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: fieldEtc.propertyOptions.lazyDirectRawWrite.'+
                                ' (!thisLocal.isOriginalResponseDone()). There is no value yet on CacheHandler!"\n' + this);
                        }
                        thisLocal._isRealResponseDoneDirectRawWrite = true;
                        putOnCache$ = this.session.manager.config.cacheHandler.putOnCache(thisLocal.attachRefId, responselike.body as NodeJS.ReadStream).pipe(
                            tap(() => {
                                thisLocal.firstPutOnCacheRef.value = undefined;
                            })
                        );
                        thisLocal.firstPutOnCacheRef.value = putOnCache$;
                    } else {
                        if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                            thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: fieldEtc.propertyOptions.lazyDirectRawWrite.'+
                                '(thisLocal.isOriginalResponseDone()). Already have value on CacheHandler or responselike.body is null!"\n' + this);
                        }
                        putOnCache$ = of(undefined);
                    }

                    let getFromCache$: Observable<NodeJS.ReadableStream>;
                    if (!isRealResponseDoneDirectRawWriteLocal) {
                        getFromCache$ = putOnCache$.pipe(
                            share(),
                            flatMap( () => {
                                return thisLocal.session.manager.config.cacheHandler.getFromCache(thisLocal.attachRefId);
                            })
                        );
                    } else {
                        // in this case responselike.body already is from the cache!
                        getFromCache$ = of(responselike.body as NodeJS.ReadableStream);
                    }
                    let afterGetFromCache$: Observable<L>;
                    
                    if (!fieldEtc.fieldProcessorCaller.callFromDirectRaw) {
                        afterGetFromCache$ = putOnCache$.pipe(
                            map(() => {
                                return responselike.body as L;
                            })
                        );
                    } else {
                        afterGetFromCache$ = getFromCache$.pipe(
                            flatMap((respStream) => {
                                return fieldEtc.fieldProcessorCaller.callFromDirectRaw(of({ body: respStream}), fieldEtc.fieldInfo);
                            }),
                            map((respL) => {
                                return respL.body;
                            })
                        );
                    }
                    if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                        thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: fieldEtc.propertyOptions.lazyDirectRawWrite.'+
                            ' thisLocal.lazyLoadedObj will never be setted, value will be always obtained from CacheHandler!"\n' + this);
                    }

                    return afterGetFromCache$;
                } else if (fieldEtc.fieldProcessorCaller.callFromDirectRaw) {
                    if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                        thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: LazyRefPrp is "lazyDirectRawRead" and has "IFieldProcessor.fromDirectRaw".');
                    }           
                    let fromDirectRaw$ = fieldEtc.fieldProcessorCaller.callFromDirectRaw(of(responselike as ResponseLike<NodeJS.ReadableStream>), fieldEtc.fieldInfo);

                    lazyLoadedObj$ = 
                        fromDirectRaw$
                            .pipe(
                                thisLocal.mapJustOnceKeepAllFlagsRxOpr((respL) => {
                                    if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                                        thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: Async on "IFieldProcessor.fromDirectRaw" result. Me:\n' + this);
                                    }
                                    thisLocal.setLazyObjOnLazyLoadingNoNext(respL.body);
                                    return this.lazyLoadedObj;
                                })
                            );
                    lazyLoadedObj$ = lazyLoadedObj$.pipe(
                        thisLocal.session.registerProvidedObservablesRxOpr(),
                        share()
                    );
                    return lazyLoadedObj$;
                } else {
                    if(Object.getOwnPropertyNames(fieldEtc.lazyLoadedObjType).lastIndexOf('pipe') < 0) {
                        throw new Error('LazyRefBase.processResponse: LazyRefPrp is "lazyDirectRawRead" and has no "IFieldProcessor.fromDirectRaw",'+
                            ' but this generic definition is LazyRepPrp<'+(fieldEtc.lazyLoadedObjType? fieldEtc.lazyLoadedObjType.name: '')+'>. Me:\n' +
                            this);
                    }
                    if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                        thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: LazyRef is "lazyDirectRawRead" and has NO "IFieldProcessor.fromDirectRaw". Using "responselike.body"');
                    }
                }
            } else if (
                    (fieldEtc.lazyRefMarkerType === LazyRefPrpMarker && !fieldEtc.propertyOptions.lazyDirectRawRead)
                    || (fieldEtc.lazyRefMarkerType === LazyRefPrpMarker && fieldEtc.propertyOptions.lazyDirectRawRead && !isResponseBodyStream)) {
                if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: (LazyRefPrp is NOT "lazyDirectRawRead") or '+
                        '(LazyRefPrp is "lazyDirectRawRead" and "responseLike.body" is not a NodeJS.ReadableStream). Is it rigth?! Me:\n' + this);
                }
                if (fieldEtc.fieldProcessorCaller.callFromLiteralValue) {
                    if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                        thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: ((LazyRefPrp is NOT "lazyDirectRawRead") or (...above...)) and has "IFieldProcessor.fromLiteralValue".');
                    }
                    
                    const fromLiteralValue = fieldEtc.fieldProcessorCaller.callFromLiteralValue(responselike.body, fieldEtc.fieldInfo);
                    if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                        thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: Async on "IFieldProcessor.fromLiteralValue" result. Me:\n' + this);
                    }
                    thisLocal.lazyRefPrpStoreOriginalliteralEntryIfNeeded(
                        mdRefererObj,
                        fieldEtc,
                        playerSnapshot as PlayerSnapshot);
                    thisLocal.setLazyObjOnLazyLoadingNoNext(fromLiteralValue);
                } else {
                    if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                        thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: ((LazyRefPrp is NOT "lazyDirectRawRead") or (...above...)) and has NO "IFieldProcessor.fromLiteralValue". Using "responselike.body"');
                    }
                    this.setLazyObjOnLazyLoadingNoNext(responselike.body as L);
                }
            } else {
                if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: LazyRef for a relationship. Me:\n' + this);
                }
                let processedEntity = this.session.processWrappedSnapshotFieldInternal(fieldEtc.lazyLoadedObjType, (playerSnapshot as PlayerSnapshot).wrappedSnapshot)
                this.setLazyObjOnLazyLoadingNoNext(processedEntity as L);
                //was the only way I found to undock the Observable<L> from the Observable<Response>
                //  The side effect of this is that map() called before this exchange is
                //  not piped with new Observable.
            }
        }
        if (this.signatureStr && !lazyLoadedObj$) {
            if (!this.session.isOnRestoreEntireStateFromLiteral()) {
                if (!mdRefererObj.$signature$ && !mdRefererObj.$isComponentPlayerObjectId$) {
                    throw new Error('The referer object has no mdRefererObj.$signature$. This should not happen. Me:\n' + this);
                } else {
                    if (isLazyRefOfCollection) {

                    }
                }
                if (!mdRefererObj.$signature$) {
                    if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                        thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: (!mdRefererObj.$signature$): owner entity not found for LazyRef, the owner must be a player side component. Me:\n' + this);
                    }
                }
                this.session.storeOriginalLiteralEntry(
                    {
                        method: 'lazyRef',
                        ownerSignatureStr: mdRefererObj.$signature$,
                        ownerFieldName: this.refererKey,
                        playerSnapshot: playerSnapshot as PlayerSnapshot,
                        ref: {
                            iAmAnEntityRef: true,
                            signatureStr: thisLocal.signatureStr
                        }
                    }
                );
            }
            if (fieldEtc.prpGenType.gType !== LazyRefPrpMarker) {
                if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeProcResp.group('LazyRefBase.processResponse: Not LazyRefPrp, keeping reference by signature ' + this.signatureStr);
                    thisLocal.consoleLikeProcResp.debug(this.lazyLoadedObj);
                    thisLocal.consoleLikeProcResp.groupEnd();
                }
                this.session.tryCacheInstanceBySignature(
                    {
                        realInstance: this.lazyLoadedObj,
                        playerSnapshot: playerSnapshot as PlayerSnapshot,
                        lazySignature: this.signatureStr
                    }
                );
            } else {
                if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeProcResp.debug('LazyRefBase.processResponse: IS LazyRefPrp, NOT keeping reference by signature. Me:\n' + this);
                }
            }
        }

        if (lazyLoadedObj$) {
            lazyLoadedObj$ = lazyLoadedObj$.pipe(
                thisLocal.mapJustOnceKeepAllFlagsRxOpr(
                    (lazyLoadedObjValueB: L) => {
                        if (thisLocal.respObs && thisLocal.session.isOnRestoreEntireStateFromLiteral()) {
                            if (thisLocal.consoleLikeProcResp.enabledFor(RecorderLogLevel.Trace)) {
                                thisLocal.consoleLikeProcResp.group('LazyRefBase.processResponse: changing "this.respObs"'+
                                    ' to null because "this.session.isOnRestoreEntireStateFromLiteral()"\n' + this);
                                thisLocal.consoleLikeProcResp.debug(thisLocal.lazyLoadedObj);
                                thisLocal.consoleLikeProcResp.groupEnd();
                            }
                        }
                        return lazyLoadedObjValueB;
                    }
                ),
                thisLocal.session.registerProvidedObservablesRxOpr(),
                map((lazyLoadedObjValueC: L) => {
                    return lazyLoadedObjValueC;
                }),
                share()
            ),
            lazyLoadedObj$.subscribe((lazyLoadedObj) => {
                thisLocal.respObs = null;
                this.setLazyObjOnLazyLoadingNoNext(lazyLoadedObj);
            });
        }
        return thisLocal.lazyLoadedObj;
    }

    private lazyRefPrpStoreOriginalliteralEntryIfNeeded(mdRefererObj: PlayerMetadatas, fieldEtc: FieldEtc<L, any>, playerSnapshot: PlayerSnapshot): void {
        const thisLocal = this;
        if (!this.session.isOnRestoreEntireStateFromLiteral()) {
            if (thisLocal.consoleLike.enabledFor(RecorderLogLevel.Trace)) {
                thisLocal.consoleLike.debug('LazyRefBase.processResponse: Storing LazyRefPrp. Me:\n' + this);
            }
            if (this.attachRefId) {
                this.session.storeOriginalLiteralEntry(
                    {
                        method: 'lazyRef',
                        ownerSignatureStr: mdRefererObj.$signature$,
                        ownerFieldName: this.refererKey,
                        attachRefId: this.attachRefId,
                        ref: {
                            iAmAnEntityRef: true,
                            signatureStr: thisLocal.signatureStr
                        }
                    }
                );
            } else {
                this.session.storeOriginalLiteralEntry(
                    {
                        method: 'lazyRef',
                        ownerSignatureStr: mdRefererObj.$signature$,
                        ownerFieldName: this.refererKey,
                        playerSnapshot: playerSnapshot,
                        ref: {
                            iAmAnEntityRef: true,
                            signatureStr: thisLocal.signatureStr
                        }
                    }
                );
            }
        }
        if (thisLocal.consoleLike.enabledFor(RecorderLogLevel.Trace)) {
            thisLocal.consoleLike.group('LazyRefBase.processResponse: Storing LazyRefPrp, keeping reference by signature ' + this.signatureStr);
            thisLocal.consoleLike.debug(this.lazyLoadedObj);
            thisLocal.consoleLike.groupEnd();
        }
        if (fieldEtc.prpGenType.gType !== LazyRefPrpMarker) {
            this.session.tryCacheInstanceBySignature(
                {
                    realInstance: this.lazyLoadedObj,
                    playerSnapshot: playerSnapshot,
                    lazySignature: this.signatureStr
                }
            );
        }
    }

    subscribeToModify(observerOrNext?: PartialObserver<L> | ((value: L) => void),
        error?: (error: any) => void,
        complete?: () => void) {
        const thisLocal = this;

        let fieldEtc = RecorderManagerDefault.resolveFieldProcessorPropOptsEtc<L, any>(this.session.fielEtcCacheMap, this.refererObj, this.refererKey, this.session.manager.config);
        let observerOriginal: PartialObserver<L>;
        if ((observerOrNext as PartialObserver<L>).next
            || (observerOrNext as PartialObserver<L>).complete
            || (observerOrNext as PartialObserver<L>).error
            || (observerOrNext as PartialObserver<L>).next) {
            if (error || complete) {
                throw new Error('observerOrNext is a PartialObserver and error or complete are passed as parameter');
            }
            observerOriginal = observerOrNext as PartialObserver<L>;
        } else {
            observerOriginal = {
                next: observerOrNext as (value: L) => void,
                error: error,
                complete: complete
            }
        }
        let observerNew: PartialObserver<L> = {...observerOriginal};

        if (!this.isLazyLoaded()) {
            observerNew.next = (value: L) => {
                if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                    thisLocal.consoleLikeSubs.group('(Asynchronous) LazyRef.subscribeToChange() => modifiedNext, (thisLocal.respObs != null)');
                    thisLocal.consoleLikeSubs.debug('calling nextOriginal()'); thisLocal.consoleLikeSubs.debug('this.subscriptionToChange.unsubscribe()'); thisLocal.consoleLikeSubs.debug('this.next()\n' + this); thisLocal.consoleLikeSubs.debug(thisLocal.lazyLoadedObj);
                    thisLocal.consoleLikeSubs.groupEnd();
                }
                thisLocal.setLazyObjOnLazyLoadingNoNext(value);
                // AAAAASYNCHRONOUS OF AAAAASYNCHRONOUS!!!
                //propety set and collection add will call session.notifyAllLazyrefsAboutEntityModification()
                // this will cause infinit recursion, so call session.switchOffNotifyAllLazyrefs
                thisLocal.session.switchOffNotifyAllLazyrefs(thisLocal.lazyLoadedObj);
                //call that will change the data Asynchronously
                if (observerOriginal.next) {
                    observerOriginal.next(thisLocal.lazyLoadedObj);
                }
                //no more problems with infinite recursion
                thisLocal.session.switchOnNotifyAllLazyrefs(thisLocal.lazyLoadedObj);

                //this ensures that the change command will not be called twice.
                this.subscriptionToChangeUnsubscribe();
                //here all other previous subscribes will be called. Pipe async's for example
                thisLocal.nextPriv(true, thisLocal.lazyLoadedObj);
            };

            if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                thisLocal.consoleLikeSubs.debug('Keeping Subscription from this.subscribe(observerOrNextNovo) on this.subscriptionToChange to make an unsubscribe() at the end of modifiedNext callback\n' + this);
            }
            this.subscriptionToChange = this.subscribe(observerNew);
            //this.subscriptionToChangeUnsubscribe();
            //thisLocal.next(thisLocal.lazyLoadedObj);

            //AAAAASYNCHRONOUS!!!
        } else {
            //SSSSSYNCHRONOUS!!!
            if (thisLocal.consoleLikeSubs.enabledFor(RecorderLogLevel.Trace)) {
                thisLocal.consoleLikeSubs.group('(Synchronous) LazyRef.subscribeToChange()');
                thisLocal.consoleLikeSubs.debug('calling nextOriginal()'); thisLocal.consoleLikeSubs.debug('this.next()\n' + this);
                thisLocal.consoleLikeSubs.groupEnd();
            }
            try {
                //that will change the data Synchronously
                if (observerOriginal.next) {
                    observerOriginal.next(thisLocal.lazyLoadedObj);
                }
                //here all the other observer's will be called. Pipe async's for example
                thisLocal.nextPriv(true, thisLocal.lazyLoadedObj);
            } catch(err) {
                if (observerOriginal.error) {
                    observerOriginal.error(err);
                } else {
                    throw {...new Error('unexpected'), reason: err, cause: err};
                }
            }
        }
    }

    public get playerObjectId(): I {
        return this._playerObjectId;
    }
    public get lazyLoadedObj(): L {
        return this._lazyLoadedObj;
    }
    public get signatureStr(): string {
        return this._signatureStr;
    }
    public set playerObjectId(value: I) {
        this._playerObjectId = value;
    }
    public set signatureStr(value: string) {
        this._signatureStr = value;
    }
    public get respObs(): Observable<ResponseLike<Object>> {
        return this._respObs;
    }
    public set respObs(value: Observable<ResponseLike<Object>>) {
        this._respObs = value;
    }

    private _fieldProcessorEvents: IFieldProcessorEvents<L> = {}

    /** Framework internal use. */
    public get fieldProcessorEvents(): IFieldProcessorEvents<L> {
        return this._fieldProcessorEvents;
    }
    // private createFlatMapCallback(): (response: ResponseLike<L>) => Observable<L> {
    //     const thisLocal = this;
    //     return (response) => {
    //         if (!response || !response.body) {
    //             throw new Error('response or response.body is null');
    //         }
    //         return thisLocal.processResponseOnLazyLoading(response);
    //     };
    // }
    
	public get refererObj(): any {
		return this._refererObj;
	}
	public set refererObj(value: any) {
		this._refererObj = value;
	}
	public get refererKey(): string {
		return this._refererKey;
	}
	public set refererKey(value: string) {
		this._refererKey = value;
    }
	public get session(): RecorderSessionImplementor {
		return this._session;
	}
	public set session(value: RecorderSessionImplementor) {
		this._session = value;
    }
    public get genericNode(): GenericNode {
		return this._genericNode;
	}
	public set genericNode(value: GenericNode) {
		this._genericNode = value;
	}    
}