//import { Observable } from 'rxjs/Observable';
import { Observable, Subscription, Subject, Subscriber, of as observableOf } from 'rxjs';
import { PartialObserver } from 'rxjs/Observer';
import { GenericNode, GenericTokenizer } from './generic-tokenizer';
import { Type } from '@angular/core';
import { JsHbPlaybackAction, JsHbPlaybackActionType } from './js-hb-playback-action';
import { IJsHbSession } from './js-hb-session';
import { JsHbLogLevel } from './js-hb-config';
import { get as lodashGet, has as lodashHas } from 'lodash';
import { flatMap } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';

export class LazyRefMTO<L extends object, I> extends Subject<L> {
    iAmLazyRef: boolean = true;
    hbId: I;
    //lazyLoadedObj: L;
    signatureStr: string;
    /**
     * Diferente do subscribe comum, que deve ser executado toda vez que os dados
     * forem alterados, esse somente eh executado uma vez e dispara um next para
     * que todos as outras subscricoes (pipe async's por exemplo) sejam chamadas.
     * por isso nao retorna Subscription, afinal ele nao se inscreve permanentemente
     * na lista de observer's.
     * @param observerOrNext
     * @param error
     * @param complete
     */
    subscribeToChange(observer?: PartialObserver<L>): void;
    subscribeToChange(next?: (value: L) => void, error?: (error: any) => void, complete?: () => void): void;
    subscribeToChange(): void { throw new Error('LazyRefMTO is not the real implementation base, use LazyRefBase!'); }
    /**
     * 
     * @param lazyLoadedObj 
     */
    setLazyObj(lazyLoadedObj: L): void { throw new Error('LazyRefMTO is not the real implementation base, use LazyRefBase!'); };
    isLazyLoaded(): boolean { throw new Error('LazyRefMTO is not the real implementation base, use LazyRefBase!'); };
    /**
     * Framework internal use.
     * @param responseLike 
     */
    processResponse(responselike: { body: any }): L { throw new Error('LazyRefMTO is not the real implementation base, use LazyRefBase!'); };
}

export declare type LazyRefOTM<L extends object> = LazyRefMTO<L, undefined>;

export class LazyRefBase<L extends object, I> extends LazyRefMTO<L, I> {
    private _hbId: I;
    private _lazyLoadedObj: L;
    private _genericNode: GenericNode;
    private _signatureStr: string;
    private _respObs: Observable<HttpResponse<Object>>;
    private _flatMapCallback: (response: HttpResponse<L>) => Observable<L>;
    private _refererObj: any;
    private _refererKey: string;
    private _session: IJsHbSession;

    constructor() {
        super();
        this._lazyLoadedObj = null;
    }

    private _isOnInternalSetLazyObjForCollection: boolean = false;

    public internalSetLazyObjForCollection(lazyLoadedObj: L): void {
        try {
            this._isOnInternalSetLazyObjForCollection = true;
            this.setLazyObj(lazyLoadedObj);
        } finally {
            this._isOnInternalSetLazyObjForCollection = false;
        }
    }

    public isLazyLoaded(): boolean { 
        return this.respObs == null && this.lazyLoadedObj != null;
    };
        
    // public getFlatMapOfResponseCallback(): (responseLike: {body: L}) => Observable<L> {
    //     return this._flatMapCallback;
    // }

    public setLazyObj(lazyLoadedObj: L): void {
        //anulando os response.
        this.respObs = null;
        //Validando
        if (!this.refererObj || !this.refererKey) {
            throw new Error('The property \'' + this.refererKey + ' has no refererObj or refererKey');
        }
        let prpGenType: GenericNode = GenericTokenizer.resolveNode(this.refererObj, this.refererKey);
        if (prpGenType == null) {
            throw new Error('The property \'' + this.refererKey + ' from \'' + this.refererObj.constructor.name + '\' is not decorated with com \'@Reflect.metadata("design:generics", GenericTokenizer\'...');
        }
        if (prpGenType.gType !== LazyRefMTO) {
            throw new Error('The property \'' + this.refererKey + ' from \'' + this.refererObj.constructor.name + '\' is not LazyRef');
        }
        let lazyRefGenericParam: Type<any> = null;
        if (prpGenType.gParams.length > 0) {
            if (prpGenType.gParams[0] instanceof GenericNode) {
                lazyRefGenericParam = (prpGenType.gParams[0] as GenericNode).gType;
            } else {
                lazyRefGenericParam = (prpGenType.gParams[0] as Type<any>);
            }
        }
        if ((lazyRefGenericParam === Set || lazyRefGenericParam === Array) && !this._isOnInternalSetLazyObjForCollection) {
            throw new Error('The property \'' + this.refererKey + ' from \'' + this.refererObj.constructor.name + '\' can not be \'' + lazyRefGenericParam.name + '\'');
        }

        if (this.session.isRecording() && !this.session.isOnRestoreEntireStateFromLiteral()){
            //gravando o playback
            let action: JsHbPlaybackAction = new JsHbPlaybackAction();
            action.fieldName = this.refererKey;
            action.actionType = JsHbPlaybackActionType.SetField;
            if (lodashHas(this.refererObj, this.session.jsHbManager.jsHbConfig.jsHbSignatureName)) {
                action.ownerSignatureStr = lodashGet(this.refererObj, this.session.jsHbManager.jsHbConfig.jsHbSignatureName) as string;
            } else if (lodashHas(this.refererObj, this.session.jsHbManager.jsHbConfig.jsHbCreationIdName)) {
                action.ownerCreationRefId = lodashGet(this.refererObj, this.session.jsHbManager.jsHbConfig.jsHbCreationIdName) as number;
            } else if (!this._isOnInternalSetLazyObjForCollection) {
                throw new Error('The property \'' + this.refererKey + ' from \'' + this.refererObj.constructor.name + '\' has a not managed owner');
            }

            if (lazyLoadedObj != null) {
                if (lodashHas(lazyLoadedObj, this.session.jsHbManager.jsHbConfig.jsHbSignatureName)) {
                    action.settedSignatureStr = lodashGet(lazyLoadedObj, this.session.jsHbManager.jsHbConfig.jsHbSignatureName) as string;
                } else if (lodashHas(lazyLoadedObj, this.session.jsHbManager.jsHbConfig.jsHbCreationIdName)) {
                    action.settedCreationRefId = lodashGet(lazyLoadedObj, this.session.jsHbManager.jsHbConfig.jsHbCreationIdName) as number;
                } else if (!this._isOnInternalSetLazyObjForCollection) {
                    throw new Error('The property \'' + this.refererKey + ' from \'' + this.refererObj.constructor.name + '\'.  lazyLoadedObj is not managed: \'' + lazyLoadedObj.constructor.name + '\'');
                }
            }

            this.session.addPlaybackAction(action);
        }

        this.lazyLoadedObj = lazyLoadedObj;
        this.next(lazyLoadedObj);
    }

    subscribe(observerOrNext?: PartialObserver<L> | ((value: L) => void),
        error?: (error: any) => void,
        complete?: () => void): Subscription {
        const thisLocal = this;
        let resultSubs: Subscription = null;
        //aqui sobrescreve mas nao vai acontecer nada pois aindanao fizemos o next
        if (observerOrNext instanceof Subscriber) {
            resultSubs = super.subscribe(observerOrNext);
        } else {
            resultSubs = super.subscribe(<(value: L) => void>observerOrNext, error, complete);
        }

        let nextOriginal: (value: L) => void = null;
        if (thisLocal.lazyLoadedObj == null) {
            if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                console.debug(
                    '(thisLocal.lazyLoadedObj == null)\n'
                    +'It may mean that we have not subscribed yet in the Observable of Response');
            }
            if (this.respObs == null) {
                if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                    console.debug(
                        '(this.respObs == null)\n'
                        +'Means that we already subscribed to an earlier moment in the Observable of Reponse.\n'
                        +'We will simply call the super.subscribe');
                }
            } else if (this.session.getCachedBySignature(this.signatureStr)) {
                if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                    console.debug(
                        '(this.lazyLoadedObj == null && this.respObs != null && this.session.getCachedBySignature(this.signatureStr)\n'
                        +'Means that we already loaded this object by signature with another lazyRef.\n'
                        +'We will get from session signature cache call next()');
                }
                thisLocal.respObs = null;
                thisLocal.lazyLoadedObj = <L> this.session.getCachedBySignature(this.signatureStr);
                thisLocal.next(thisLocal.lazyLoadedObj);
            } else {
                if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                    console.debug(
                        '(thisLocal.respObs != null)\n'
                        +'Means that we are not subscribed yet in the Observable of Reponse.\n'
                        +'this.respObs will be null after subscription, so we mark that '
                        +'there is already an inscription in the Response Observable, and we '+
                        'will not make two trips to the server');
                }
                let localObs: Observable<L> = 
                    thisLocal.respObs
                        .pipe(
                            flatMap(thisLocal.flatMapCallback)
                        );
                //assim marcaremos que ja ouve inscricao no Observable de response, e nao faremos duas idas ao servidor.
                thisLocal.respObs = null;

                let observerOrNextNew: PartialObserver<L> | ((value: L) => void) = null;
                if (observerOrNext instanceof Subscriber) {
                    observerOrNextNew = observerOrNext;
                    nextOriginal = (<Subscriber<L>>observerOrNext).next;
                    (<Subscriber<L>>observerOrNext).next = (value: L) => {
                        thisLocal.lazyLoadedObj = value;
                        if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                            console.group('(Asynchronous) LazyRef.subscribe() => modifiedNext (thisLocal.respObs != null)');
                            console.debug('calling nextOriginal()'); console.debug('this.next()'); console.debug(thisLocal.lazyLoadedObj);
                            console.groupEnd();
                        }
                        nextOriginal(thisLocal.lazyLoadedObj);
                        //aqui o metodo original sera chamado
                        thisLocal.next(thisLocal.lazyLoadedObj);
                    };

                    //o retorno disso nunca mais sera usado
                    if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                        console.group('(thisLocal.respObs != null)');
                        console.debug('localObs.subscribe() <-- The Subscription returned here will never be used again.'); console.debug(observerOrNextNew);
                        console.groupEnd();
                    }
                    localObs.subscribe(observerOrNextNew);
                } else {
                    nextOriginal = <(value: L) => void>observerOrNext;
                    observerOrNextNew = (value: L) => {
                        if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                            console.group('(Asynchronous) LazyRef.subscribe() => observerOrNextNew, (thisLocal.respObs != null)');
                            console.debug('calling nextOriginal()'); console.debug('this.next()'); console.debug(thisLocal.lazyLoadedObj);
                            console.groupEnd();
                        }

                        thisLocal.lazyLoadedObj = value;
                        nextOriginal(thisLocal.lazyLoadedObj);
                        //aqui o metodo original sera chamado
                        thisLocal.next(thisLocal.lazyLoadedObj);
                    };


                    //o retorno disso nunca mais sera usado
                    if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                        console.group('(thisLocal.respObs != null)');
                        console.debug('localObs.subscribe() <-- The Subscription returned here will never be used again.'); console.debug(observerOrNextNew); console.debug(error); console.debug(complete);
                        console.groupEnd();
                    }
                    localObs.subscribe(<(value: L) => void>observerOrNextNew, error, complete);
                }
            }
        } else {
            if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                console.debug(
                    '(thisLocal.lazyLoadedObj != null)\n'
                    +'It may mean that we already have subscribed yet in the Observable of Response\n '
                    +'or this was created with lazyLoadedObj already loaded.');
            }
            if (observerOrNext instanceof Subscriber) {
                nextOriginal = (<Subscriber<L>>observerOrNext).next;
                (<Subscriber<L>>observerOrNext).next = () => {
                    nextOriginal(thisLocal.lazyLoadedObj);
                };

                thisLocal.next(thisLocal.lazyLoadedObj);
            } else {
                nextOriginal = <(value: L) => void>observerOrNext;

                thisLocal.next(thisLocal.lazyLoadedObj);
            }
        }

        return resultSubs;
    }

    private subscriptionToChange: Subscription;

    public processResponse(responselike: { body: any }): L {
        let literalJsHbResult: {result: any};
        if (this.lazyLoadedObj == null) {
            literalJsHbResult = responselike.body;
            if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                console.group('LazyRefBase.processResponse: LazyRef.lazyLoadedObj is not setted yet: ');
                console.debug(this.lazyLoadedObj);
                console.groupEnd();
            }
            //literal.result
            if (this.genericNode.gType !== LazyRefMTO) {
                throw new Error('Wrong type: ' + this.genericNode.gType.name);
            }
            let lazyLoadedObjType: Type<any> = null;
            if (this.genericNode.gParams[0] instanceof GenericNode) {
                lazyLoadedObjType = (<GenericNode>this.genericNode.gParams[0]).gType;
            } else {
                lazyLoadedObjType = <Type<any>>this.genericNode.gParams[0];
            }
            if (this.session.isCollection(lazyLoadedObjType)) {
                if (!(this.genericNode instanceof GenericNode) || (<GenericNode>this.genericNode.gParams[0]).gParams.length <=0) {
                    throw new Error('LazyRef not defined: \'' + this.refererKey + '\' em ' + this.refererObj.constructor.name);
                }
                if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                    console.debug('LazyRefBase.processResponse: LazyRef is collection: ' + lazyLoadedObjType.name);
                }
                let collTypeParam: Type<any> =  null;
                if ((<GenericNode>this.genericNode.gParams[0]).gParams[0] instanceof GenericNode) {
                    collTypeParam = (<GenericNode>(<GenericNode>this.genericNode.gParams[0]).gParams[0]).gType;
                } else {
                    collTypeParam = <Type<any>>(<GenericNode>this.genericNode.gParams[0]).gParams[0];
                }
                if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                    console.debug('LazyRefBase.processResponse: LazyRef is collection of: ' + collTypeParam.name);
                }

                this.lazyLoadedObj = this.session.createCollection(lazyLoadedObjType, this.refererObj, this.refererKey);
                for (const literalItem of literalJsHbResult.result) {
                    // let realItem = new collTypeParam();
                    // lodashSet(realItem, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, this.session);
                    // this.session.removeNonUsedKeysFromLiteral(realItem, literalItem);
                    // lodashSet(realItem, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, true);
                    // try {
                    //     lodashMergeWith(realItem, literalItem, this.session.mergeWithCustomizerPropertyReplection(refMap));
                    // } finally {
                    //     lodashSet(this.lazyLoadedObj, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, false);
                    // }                                
                    let realItem = this.session.processJsHbResultEntityInternal(collTypeParam, literalItem);

                    this.session.addOnCollection(this.lazyLoadedObj, realItem);
                }
            } else {
                // this.lazyLoadedObj = new lazyLoadedObjType();
                // if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                //     console.debug('createNotLoadedLazyRef => this.processResponse: LazyRef is not collection: ' + lazyLoadedObjType.name);
                // }
                // lodashSet(this.lazyLoadedObj, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, this.session);
                // this.session.removeNonUsedKeysFromLiteral(this.lazyLoadedObj, literalLazyObj.result);
                // lodashSet(this.lazyLoadedObj, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, true);
                // try {
                //     lodashMergeWith(this.lazyLoadedObj, literalLazyObj.result, this.session.mergeWithCustomizerPropertyReplection(refMapFlatMapCallback));            
                // } finally {
                //     lodashSet(this.lazyLoadedObj, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, false);
                // }
                this.lazyLoadedObj = this.session.processJsHbResultEntityInternal(lazyLoadedObjType, literalJsHbResult.result);
                //foi a unica forma que encontrei de desacoplar o Observable<L> do Observable<Response>
                // O efeito colateral disso eh que qualquer *Map() chamado antes dessa troca fica
                // desatachado do novo Observable.
            }
        }
        if (this.signatureStr) {
            if (!this.session.isOnRestoreEntireStateFromLiteral()) {
                if (!lodashHas(this.refererObj, this.session.jsHbManager.jsHbConfig.jsHbSignatureName)) {
                    throw new Error('The referer object has no '+ this.session.jsHbManager.jsHbConfig.jsHbSignatureName + ' key. This should not happen.');
                }
                let ownerSignatureStr = lodashGet(this.refererObj, this.session.jsHbManager.jsHbConfig.jsHbSignatureName);
                this.session.storeOriginalLiteralEntry(
                    {
                        method: 'lazyRef',
                        ownerSignatureStr: ownerSignatureStr,
                        ownerFieldName: this.refererKey,
                        literalJsHbResult: literalJsHbResult
                    }
                );
            }
            if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                console.group('LazyRefBase.processResponse: keeping reference by signature ' + this.signatureStr);
                console.debug(this.lazyLoadedObj);
                console.groupEnd();
            }
            this.session.tryCacheInstanceBySignature(
                {
                    realInstance: this.lazyLoadedObj,
                    literalJsHbResult: literalJsHbResult,
                    lazySignature: this.signatureStr
                }
            );
            // this._objectsBySignature.set(this.signatureStr, this.lazyLoadedObj);
        }
        if (this.respObs && this.session.isOnRestoreEntireStateFromLiteral()) {
            if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                console.group('LazyRefBase.processResponse: changing "this.respObs"'+
                    ' to null because "this.session.isOnRestoreEntireStateFromLiteral()"');
                console.debug(this.lazyLoadedObj);
                console.groupEnd();
            }
            this.respObs = null;
        }
        return this.lazyLoadedObj;
    }

    subscribeToChange(observerOrNext?: PartialObserver<L> | ((value: L) => void),
        error?: (error: any) => void,
        complete?: () => void) {
        const thisLocal = this;

        let nextOriginal: (value: L) => void = null;

        let observerOrNextNovo: PartialObserver<L> | ((value: L) => void) = null;
        if (!this.isLazyLoaded()) { //isso sim significa que ainda nao foi carregado.
            //AAAAASYNCHRONOUS!!!
            if (observerOrNext instanceof Subscriber) {
                observerOrNextNovo = observerOrNext;
                nextOriginal = (<Subscriber<L>>observerOrNext).next;
                (<Subscriber<L>>observerOrNext).next = (value: L) => {
                    if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                        console.group('(Asynchronous) LazyRef.subscribeToChange() => modifiedNext, (thisLocal.respObs != null)');
                        console.debug('calling nextOriginal()'); console.debug('this.subscriptionToChange.unsubscribe()'); console.debug('this.next()'); console.debug(thisLocal.lazyLoadedObj);
                        console.groupEnd();
                    }
                    thisLocal.lazyLoadedObj = value;
                    //chamada que ira alterar os dados Asincronamente
                    nextOriginal(thisLocal.lazyLoadedObj);
                    //isso garante que o comando de alteracao nao sera chamado duas vezes.
                    thisLocal.subscriptionToChange.unsubscribe();
                    //aqui todos os outros subscribes anteriores serao chamados. Os pipe async's por exemplo
                    thisLocal.next(thisLocal.lazyLoadedObj);
                };
                if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                    console.debug('Keeping Subscription from this.subscribe(observerOrNextNovo) on this.subscriptionToChange to make an unsubscribe() at the end of modifiedNext callback');
                }
                this.subscriptionToChange = this.subscribe(observerOrNextNovo);
            } else {
                nextOriginal = <(value: L) => void>observerOrNext;
                observerOrNextNovo = (value: L) => {
                    thisLocal.lazyLoadedObj = value;
                    //chamada que ira alterar os dados Asincronamente
                    nextOriginal(thisLocal.lazyLoadedObj);
                    //isso garante que o comando de alteracao nao sera chamado duas vezes.
                    thisLocal.subscriptionToChange.unsubscribe();
                    //aqui todos os outros subscribes anteriores serao chamados. Os pipe async's por exemplo
                    thisLocal.next(thisLocal.lazyLoadedObj);
                };
                this.subscriptionToChange = this.subscribe(<(value: L) => void>observerOrNextNovo, error, complete);
            }
        } else {
            //SSSSSYNCHRONOUS!!!
            if (JsHbLogLevel.Trace >= this.session.jsHbManager.jsHbConfig.logLevel) {
                console.group('(Synchronous) LazyRef.subscribeToChange()');
                console.debug('calling nextOriginal()'); console.debug('this.next()');;
                console.groupEnd();
            }
            if (observerOrNext instanceof Subscriber) {
                observerOrNextNovo = observerOrNext;
                nextOriginal = (<Subscriber<L>>observerOrNext).next;
                //chamada que ira alterar os dados Sincronamente
                nextOriginal(thisLocal.lazyLoadedObj);
                //aqui todos os outros observer's anteriores serao chamados. Os pipe async's por exemplo
                thisLocal.next(thisLocal.lazyLoadedObj);
            } else {
                nextOriginal = <(value: L) => void>observerOrNext;
                //chamada que ira alterar os dados Sincronamente
                nextOriginal(thisLocal.lazyLoadedObj);
                //aqui todos os outros observer's anteriores serao chamados. Os pipe async's por exemplo
                thisLocal.next(thisLocal.lazyLoadedObj);
            }
        }
    }

    // public subscribeAOriginal: () => Subscription;
    // public subscribeBOriginal: (observer: PartialObserver<L>) => Subscription;
    // public subscribeCOriginal: (next?: (value: L) => void, error?: (error: any) => void, complete?: () => void) => Subscription;

    // private subscribeA(): Subscription {
    //     return null;
    // }
    // private subscribeB(observer: PartialObserver<L>): Subscription {
    //     return null;
    // }
    // private subscribeC(next?: (value: L) => void, error?: (error: any) => void, complete?: () => void): Subscription {
    //     if (this.lazyLoadedObj == null) {
    //         next(this.lazyLoadedObj);
    //     } else {
    //         this.
    //     }
    //     return null;
    // }

    /**
      * Getter hbId
      * @return {I}
      */
    public get hbId(): I {
        return this._hbId;
    }

    /**
     * Getter lazyLoadedObj
     * @return {L}
     */
    public get lazyLoadedObj(): L {
        return this._lazyLoadedObj;
    }

    /**
     * Getter signatureStr
     * @return {string}
     */
    public get signatureStr(): string {
        return this._signatureStr;
    }

    /**
     * Getter respObs
     * @return {Observable<HttpResponse<Object>>}
     */
    public get respObs(): Observable<HttpResponse<Object>> {
        return this._respObs;
    }

    /**
     * Setter hbId
     * @param {I} value
     */
    public set hbId(value: I) {
        this._hbId = value;
    }

    /**
     * Setter lazyLoadedObj
     * @param {L} value
     */
    public set lazyLoadedObj(value: L) {
        this._lazyLoadedObj = value;
    }

    /**
     * Setter signatureStr
     * @param {string} value
     */
    public set signatureStr(value: string) {
        this._signatureStr = value;
    }

    /**
     * Setter respObs
     * @param {Observable<Response>} value
     */
    public set respObs(value: Observable<HttpResponse<Object>>) {
        this._respObs = value;
    }

    private set flatMapCallback(value: (response: HttpResponse<L>) => Observable<L>) {
        this._flatMapCallback = value;
    }

    private get flatMapCallback(): (response: HttpResponse<L>) => Observable<L> {
        if (!this._flatMapCallback) {
            this._flatMapCallback = (response) => {
                let lReturn = this.processResponse(response);
                return observableOf(lReturn);
            };
        }
        return this._flatMapCallback;
    }
    
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
	public get session(): IJsHbSession {
		return this._session;
	}
	public set session(value: IJsHbSession) {
		this._session = value;
    }
    public get genericNode(): GenericNode {
		return this._genericNode;
	}
	public set genericNode(value: GenericNode) {
		this._genericNode = value;
	}    
}