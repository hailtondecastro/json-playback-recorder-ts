import { GenericNode, GenericTokenizer } from './generic-tokenizer';
import { LazyRefMTO, LazyRefBase } from './lazy-ref';
import { IJsHbManager } from './js-hb-manager';
import { Type } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { MergeWithCustomizer } from 'lodash';
import { throwError } from 'rxjs';
import { JsHbContants } from './js-hb-constants';
import { JsHbPlayback } from './js-hb-playback';
import { JsHbPlaybackAction, JsHbPlaybackActionType } from './js-hb-playback-action';
import { JsHbSetCreator } from './js-hb-set-creator';
import { JSONHelper } from './json-helper';
import { JsHbLogLevel } from './js-hb-config';
import { set as lodashSet, get as lodashGet, has as lodashHas, mergeWith as lodashMergeWith, keys as lodashKeys, clone as lodashClone } from 'lodash';
import { NgJsHbDecorators } from './js-hb-decorators';

export interface JsHbEntityRef {
    iAmAJsHbEntityRef: boolean;
    signatureStr?: string;
    creationId?: number;
}

/**
 * Framework internal use.<br>
 */
export interface OriginalLiteralValueEntry {
    method: 'processJsHbResultEntity' | 'processJsHbResultEntityArray' | 'newEntityInstance' | 'lazyRef';
    reflectFunctionMetadataTypeKey?: string;
    ownerSignatureStr?: string;
    ownerFieldName?: string;
    literalJsHbResult?: {result: any};
    ref?: JsHbEntityRef;
}

interface JsHbSessionState {
    nextCreationId: number;
    originalLiteralValueEntries: Array<OriginalLiteralValueEntry>
    latestPlaybackArrAsLiteral: Array<any>;
    currentJsHbPlaybackAsLiteral?: any;
}

export interface IJsHbSession {
    //loadLazyRef<L, I>(literalJsObject: any, genericNode: GenericNode): LazyRef<L, I>;
    jsHbManager: IJsHbManager;
    //cacheLazyRef<L, I>(signatureStr: String, lazyRef: LazyRef<L, I>): void;
    /**
     * 
     * @param entityType 
     * @param literalJsHbResult a literal object with format { result: any }
     */
    processJsHbResultEntity<L>(entityType: Type<L>, literalJsHbResult: {result: any}): L;
    processJsHbResultEntityArray<L>(entityType: Type<L>, literalJsHbResult: {result: any}): Array<L>;
    newEntityInstance<T extends object>(entityType: Type<T>): T;
    startRecord(): void;
    stopRecord(): void;
    getEntireStateAsLiteral(): any;
    restoreEntireStateFromLiteral(literalState: any): void;
    isOnRestoreEntireStateFromLiteral(): boolean;
    getEntityAsLiteralRef<T>(realEntity: T): any;
    getEntityInstanceFromLiteralRef<T>(literalRef: any): T;
    getLastRecordedPlayback(): JsHbPlayback;
    getCachedBySignature<T extends object>(signatureStr: string): T;
    /**
     * Framework internal use.
     */
    addPlaybackAction(action: JsHbPlaybackAction): void;
    isRecording(): boolean;
    recordSave(entity: any): void;
    recordDelete(entity: any): void;
    getLastRecordedPlaybackAsLiteral(): any;
    /**
     * Framework internal use.
     */
    storeOriginalLiteralEntry(originalValueEntry: OriginalLiteralValueEntry): void;
    /**
     * Framework internal use.
     */
    tryCacheInstanceBySignature(
        tryOptions:
            {
                realInstance: any,
                literalJsHbResult: {result: any},
                lazySignature?: string
            }): void;
    /**
     * Framework internal use.
     */
    processJsHbResultEntityInternal<L>(entityType: Type<L>, literalResultField: any): L;

    clear(): void;
    /**
     * Framework internal use.
     */
    createApropriatedLazyRefBase<L extends object, I>(genericNode: GenericNode, literalLazyObj: any, refererObj: any, refererKey: string): LazyRefBase<L, I>;

    /**
     * Collection utility
     * @param collType 
     * @param refererObj 
     * @param refererKey 
     */
    createCollection(collType: Type<any>, refererObj: any, refererKey: string): any;
    /**
     * Collection utility
     * @param typeTested 
     */
    isCollection(typeTested: Type<any>): any;
    /**
     * Collection utility
     * @param collection 
     * @param element 
     */
    addOnCollection(collection: any, element: any): void;
    /**
     * Collection utility
     * @param collection 
     * @param element 
     */
    removeFromCollection(collection: any, element: any): void;
}

export class JsHbSessionDefault implements IJsHbSession {
    private _objectsBySignature: Map<string, any> = null;
    private _objectsByCreationId: Map<number, any> = null;
    private _originalLiteralValueEntries: Array<OriginalLiteralValueEntry> = null;
    private _nextCreationId: number = null;
    private _currentJsHbPlayback: JsHbPlayback = null;
    private _latestJsHbPlayback: Array<JsHbPlayback> = null;
    private _isOnRestoreEntireStateFromLiteral = false;

    constructor(private _jsHbManager: IJsHbManager) {
		if (!_jsHbManager) {
			throw new Error('_jsHbManager can not be null');
        }
        if (JsHbLogLevel.Debug >= _jsHbManager.jsHbConfig.logLevel) {
            console.group('JsHbSessionDefault.constructor');
			console.debug(_jsHbManager as any as string);
            console.groupEnd();
		}
        this._objectsBySignature = new Map();
        this._objectsByCreationId = new Map();
        this._originalLiteralValueEntries = [];
        this._latestJsHbPlayback = [];
    }

    public getEntireStateAsLiteral(): any {
        let thisLocal: JsHbSessionDefault = this;
        let jsHbSessionState: JsHbSessionState = {
            nextCreationId: thisLocal._nextCreationId,
            latestPlaybackArrAsLiteral: [],
            originalLiteralValueEntries: thisLocal._originalLiteralValueEntries
        };

        for (const playbackItem of this._latestJsHbPlayback) {
            jsHbSessionState.latestPlaybackArrAsLiteral.push(this.getPlaybackAsLiteral(playbackItem));
        }
        if (this._currentJsHbPlayback) {
            jsHbSessionState.currentJsHbPlaybackAsLiteral = this.getPlaybackAsLiteral(this._currentJsHbPlayback);
        }

        return jsHbSessionState;
    }

    public restoreEntireStateFromLiteral(literalState: any): void {
        this._isOnRestoreEntireStateFromLiteral = true;
        try {
            let literalStateLocal: JsHbSessionState = literalState;
            this._nextCreationId = literalStateLocal.nextCreationId;
            this._originalLiteralValueEntries = literalStateLocal.originalLiteralValueEntries;
            if (literalStateLocal.currentJsHbPlaybackAsLiteral) {
                this._currentJsHbPlayback = this.getPlaybackFromLiteral(literalStateLocal.currentJsHbPlaybackAsLiteral);
            } else {
                this._currentJsHbPlayback = null;
            }
            this._latestJsHbPlayback = [];
            for (const playbackLiteral of literalStateLocal.latestPlaybackArrAsLiteral) {
                this._latestJsHbPlayback.push(this.getPlaybackFromLiteral(playbackLiteral));
            }
            let originalLiteralValueEntriesLengthInitial: number = this._originalLiteralValueEntries.length;
            for (const originalLiteralValueEntry of this._originalLiteralValueEntries) {
                if (originalLiteralValueEntriesLengthInitial !== this._originalLiteralValueEntries.length) {
                    throw new Error('There is some error on "this.storeOriginalLiteralEntry()"'+
                        ' manipulation. Initial length ' +originalLiteralValueEntriesLengthInitial+
                        ' is differrent of actual ' + this._originalLiteralValueEntries.length);
                }
                if (originalLiteralValueEntry.method === 'processJsHbResultEntity'
                        || originalLiteralValueEntry.method === 'processJsHbResultEntityArray'
                        || originalLiteralValueEntry.method === 'newEntityInstance') {
                    let jsType: Type<any> = Reflect.getMetadata(originalLiteralValueEntry.reflectFunctionMetadataTypeKey, Function);
                    if (!jsType) {
                        throw new Error('the classe \'' + originalLiteralValueEntry.reflectFunctionMetadataTypeKey + ' is not using the decorator \'NgJsHbDecorators.clazz\'');
                    }
                    if (originalLiteralValueEntry.method === 'processJsHbResultEntity') {
                        this.processJsHbResultEntity(jsType, originalLiteralValueEntry.literalJsHbResult);
                    } else if (originalLiteralValueEntry.method === 'processJsHbResultEntityArray') {
                        this.processJsHbResultEntityArray(jsType, originalLiteralValueEntry.literalJsHbResult);
                    } else if (originalLiteralValueEntry.method === 'newEntityInstance') {
                        this.newEntityInstanceWithCreationId(jsType, originalLiteralValueEntry.ref.creationId);
                    } else {
                        throw new Error('Isso nao deveria acontecer');
                    }
                } else if (originalLiteralValueEntry.method === 'lazyRef') {
                    let ownerEnt = this._objectsBySignature.get(originalLiteralValueEntry.ownerSignatureStr);
                    if (!ownerEnt) {
                        throw new Error('ownerEnt not found for signature: ' + originalLiteralValueEntry.ownerSignatureStr);                 
                    }
                    let lazyRef: LazyRefMTO<any, any> = lodashGet(ownerEnt, originalLiteralValueEntry.ownerFieldName);
                    if (!lazyRef) {
                        throw new Error('ownerEnt has no field: ' + originalLiteralValueEntry.ownerFieldName);
                    }
                    if (!lazyRef.iAmLazyRef) {
                        throw new Error(originalLiteralValueEntry.ownerFieldName + ' is not a LazyRef for ' + ownerEnt);    
                    }
                    lazyRef.processResponse({ body: originalLiteralValueEntry.literalJsHbResult });
                } else {
                    throw new Error('Isso nao deveria acontecer');
                }
            }

            this.rerunByPlaybacksIgnoreCreateInstance();
        } finally {
            this._isOnRestoreEntireStateFromLiteral = false;
        }
    }

    public isOnRestoreEntireStateFromLiteral(): boolean {
        return this._isOnRestoreEntireStateFromLiteral;
    }

    /**
     * Based on '[JsHbPlaybackAction.java].resolveOwnerValue(IJsHbManager, HashMap<Long, Object>)'
     * @param action 
     */
    private actionResolveOwnerValue(action: JsHbPlaybackAction): any {
        if (action.ownerSignatureStr) {
            return this._objectsBySignature.get(action.ownerSignatureStr);
        } else if (action.ownerCreationId) {
            throw new Error('This should not happen. Action: ' + action.actionType);
        } else if (action.ownerCreationRefId) {
            return this._objectsByCreationId.get(action.ownerCreationRefId);
        } else {
            throw new Error('This should not happen. Action: ' + JSON.stringify(action));
        }
    }

    /**
     * Based on '[JsHbPlaybackAction.java].resolveJavaPropertyName(ObjectMapper, IJsHbManager, HashMap<Long, Object>)'
     * @param action 
     */
    private actionResolveFieldName(action: JsHbPlaybackAction): any {
        return action.fieldName;
    }

    /**
     * Based on '[JsHbPlaybackAction.java].resolveColletion(ObjectMapper, IJsHbManager, HashMap<Long, Object>)'
     * @param action 
     */
    private actionResolveColletion(action: JsHbPlaybackAction): any {
		if (action.actionType == JsHbPlaybackActionType.CollectionAdd || action.actionType == JsHbPlaybackActionType.CollectionRemove) {
			try {
				return this.actionResolveOwnerValue(action)[this.actionResolveFieldName(action)];
			} catch (e) {
                let newErr: any = new Error('This should not happen. action. Action ' + JSON.stringify(action));
                newErr.reason = e;
                throw newErr;
			}
		} else {
            return null;
        }
    }

    /**
     * Based on '[JsHbPlaybackAction.java].resolveSettedValue(ObjectMapper, IJsHbManager, HashMap<Long, Object>)'
     * @param action 
     */
    private actionResolveSettedValue(action: JsHbPlaybackAction): any {
        let resolvedSettedValue: any;
        if (action.settedCreationRefId) {
            resolvedSettedValue = this._objectsByCreationId.get(action.settedCreationRefId);					
        } else if (action.settedSignatureStr) {
            resolvedSettedValue = this._objectsBySignature.get(action.settedSignatureStr);
        } else if (action.fieldName) {
            resolvedSettedValue = action.simpleSettedValue;
        }
        return resolvedSettedValue;
    }

    /**
     * Based on '[JsHbReplayable.java].replay()'
     */
    private rerunByPlaybacksIgnoreCreateInstance(): void {
        let allPlaybacks: JsHbPlayback[] = [
            ...this._latestJsHbPlayback.slice(),
            ...(this._currentJsHbPlayback? [this._currentJsHbPlayback]: [])
        ];
        for (const playback of allPlaybacks) {
            for (const action of playback.actions) {
                if (action.actionType != JsHbPlaybackActionType.Create) {
                    let resolvedOwnerValue: any = this.actionResolveOwnerValue(action);
                    let resolvedFieldName: string = this.actionResolveFieldName(action);
                    let resolvedCollection: any = this.actionResolveColletion(action);
                    let resolvedSettedValue: any = this.actionResolveSettedValue(action);

                    const wasCollectionAsyncronousModified = { value: true };
                    switch (action.actionType) {
                        case JsHbPlaybackActionType.CollectionAdd:
                            if (resolvedCollection && (resolvedCollection as LazyRefMTO<any, any>).iAmLazyRef) {
                                //em tese isso deve ser sincrono por ja estar
                                (resolvedOwnerValue[resolvedFieldName] as LazyRefMTO<any, any>)
                                    .subscribeToChange(coll => {
                                        this.addOnCollection(coll, resolvedSettedValue);
                                        wasCollectionAsyncronousModified.value = false;
                                    });
                            } else {
                                this.addOnCollection(resolvedCollection, resolvedSettedValue);
                                wasCollectionAsyncronousModified.value = false;
                            }
                            if (wasCollectionAsyncronousModified.value) {
                                throw new Error('Invalid action. Collection was not loaded on current state: ' + JSON.stringify(action));
                            }
                            break;
                        case JsHbPlaybackActionType.CollectionRemove:
                            if (resolvedCollection && (resolvedCollection as LazyRefMTO<any, any>).iAmLazyRef) {
                                //em tese isso deve ser sincrono por ja estar
                                (resolvedOwnerValue[resolvedFieldName] as LazyRefMTO<any, any>)
                                    .subscribeToChange(coll => {
                                        this.removeFromCollection(coll, resolvedSettedValue);
                                        wasCollectionAsyncronousModified.value = false;
                                    });
                            } else {
                                this.removeFromCollection(resolvedCollection, resolvedSettedValue);
                                wasCollectionAsyncronousModified.value = false;
                            }
                            if (wasCollectionAsyncronousModified.value) {
                                throw new Error('Invalid action. Collection was not loaded on current state: ' + JSON.stringify(action));
                            }
                            break;
                        case JsHbPlaybackActionType.SetField:
                            if (resolvedOwnerValue[resolvedFieldName] && (resolvedOwnerValue[resolvedFieldName] as LazyRefMTO<any, any>).iAmLazyRef) {
                                (resolvedOwnerValue[resolvedFieldName] as LazyRefMTO<any, any>).setLazyObj(resolvedSettedValue);
                            } else {
                                resolvedOwnerValue[resolvedFieldName] = resolvedSettedValue;
                            }
                            break;
                        case JsHbPlaybackActionType.Delete:
                            //nada
                            break;
                        case JsHbPlaybackActionType.Save:
                            //nada
                            break;
                        default:
                            throw new Error('Isso nao deveria acontecer');
                    }
                }
            }
        }
    }

    public getEntityAsLiteralRef<T>(realEntity: T): any {
        let jsHbEntityRefReturn: JsHbEntityRef;
        if (lodashHas(realEntity, this.jsHbManager.jsHbConfig.jsHbSignatureName)) {
            jsHbEntityRefReturn = {
                signatureStr: lodashGet(realEntity, this.jsHbManager.jsHbConfig.jsHbSignatureName),
                iAmAJsHbEntityRef: true
            }
        } else if (lodashHas(realEntity, this.jsHbManager.jsHbConfig.jsHbCreationIdName)) {
            jsHbEntityRefReturn = {
                creationId: lodashGet(realEntity, this.jsHbManager.jsHbConfig.jsHbCreationIdName),
                iAmAJsHbEntityRef: true
            }
        } else {
            throw new Error('Invalid operation. Not managed entity. Entity: \'' + realEntity.constructor + '\'');
        }
        return jsHbEntityRefReturn;
    }

    public getEntityInstanceFromLiteralRef<T>(literalRef: any): T {
        let jsHbEntityRef: JsHbEntityRef = literalRef;
        if (jsHbEntityRef.iAmAJsHbEntityRef && jsHbEntityRef.signatureStr) {
            return this._objectsBySignature.get(jsHbEntityRef.signatureStr);
        } else if (jsHbEntityRef.iAmAJsHbEntityRef && jsHbEntityRef.creationId) {
            return this._objectsByCreationId.get(jsHbEntityRef.creationId);
        } else {
            throw new Error('Invalid operation. Not managed entity. literalRef: \'' + literalRef + '\'');
        }
    }

    /**
     * Getter jsHbManager
     * @return {IJsHbManager}
     */
    public get jsHbManager(): IJsHbManager {
        return this._jsHbManager;
    }

    /**
     * Setter jsHbManager
     * @param {IJsHbManager} value
     */
    public set jsHbManager(value: IJsHbManager) {
        if (JsHbLogLevel.Debug >= this.jsHbManager.jsHbConfig.logLevel) {
            console.group('JsHbSessionDefault.jsHbManager set');
			console.debug(value as any as string);
            console.groupEnd();
		}
        this._jsHbManager = value;
    }

    public processJsHbResultEntity<L>(entityType: Type<L>, literalJsHbResult: {result: any}): L {
        if (!literalJsHbResult.result) {
            throw new Error('literalJsHbResult.result existe' + JSON.stringify(literalJsHbResult));
        }
        let clazzOptions: NgJsHbDecorators.clazzOptions = Reflect.getMetadata(JsHbContants.JSHB_REFLECT_METADATA_JAVA_CLASS, entityType);
        if (!clazzOptions) {
            throw new Error('the classe \'' + entityType + ' is not using the decorator \'NgJsHbDecorators.clazz\'');
        }
        if (!this.isOnRestoreEntireStateFromLiteral()) {
            this.storeOriginalLiteralEntry(
                {
                    method: 'processJsHbResultEntity',
                    reflectFunctionMetadataTypeKey: NgJsHbDecorators.mountContructorByJavaClassMetadataKey(clazzOptions, entityType),
                    literalJsHbResult: literalJsHbResult
                });
        }
        if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            console.group('JsHbSessionDefault.processJsHbResultEntity<L>()');
            console.debug(entityType); console.debug(literalJsHbResult);
            console.groupEnd();
        }
        let refMap: Map<Number, any> = new Map<Number, any>();
        let result = this.processJsHbResultEntityPriv(entityType, literalJsHbResult.result, refMap);
        if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            console.group('JsHbSessionDefault.processJsHbResultEntity<L>().  result:');
            console.debug(result);
            console.groupEnd();
        }
        
        //result.constructor == Set;
        //Object.getPrototypeOf(result).constructor == Set;

        return result;
    }

    public processJsHbResultEntityArray<L>(entityType: Type<L>, literalJsHbResult: {result: any}): Array<L> {
        if (!literalJsHbResult.result) {
            throw new Error('literalJsHbResult.result existe' + JSON.stringify(literalJsHbResult));
        }
        let clazzOptions: NgJsHbDecorators.clazzOptions = Reflect.getMetadata(JsHbContants.JSHB_REFLECT_METADATA_JAVA_CLASS, entityType);
        if (!clazzOptions) {
            throw new Error('the classe \'' + entityType + ' is not using the decorator \'NgJsHbDecorators.clazz\'');
        }
        if (!this.isOnRestoreEntireStateFromLiteral()) {
            this.storeOriginalLiteralEntry(
                {
                    method: 'processJsHbResultEntityArray',
                    reflectFunctionMetadataTypeKey: NgJsHbDecorators.mountContructorByJavaClassMetadataKey(clazzOptions, entityType),
                    literalJsHbResult: literalJsHbResult
                });
        }

        let resultArr: Array<L> = [];
        let refMap: Map<Number, any> = new Map<Number, any>();
        if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            console.group('JsHbSessionDefault.processJsHbResultEntityArray<L>()');
            console.debug(entityType); console.debug(literalJsHbResult);
            console.groupEnd();
        }
        for (let index = 0; index < literalJsHbResult.result.length; index++) {
            const resultElement = literalJsHbResult.result[index];
            resultArr.push(this.processJsHbResultEntityPriv(entityType, resultElement, refMap));
        }
        if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            console.group('JsHbSessionDefault.processJsHbResultEntityArray<L>(). result:');
            console.debug(resultArr);
            console.groupEnd();
		}
        return resultArr;
    }

    private newEntityInstanceWithCreationId<T extends object>(entityType: Type<T>, creationId: number): T {
        if (!this.isRecording()){
            throw new Error('Invalid operation. It is not recording. is this Error correct?!');
        }
        this.validatingControlFieldsExistence(entityType);
        let entityObj = new entityType();
        lodashSet(entityObj, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, this);
        let realKeys: string[] = Object.keys(Object.getPrototypeOf(entityObj));
        if (JsHbLogLevel.Debug >= this.jsHbManager.jsHbConfig.logLevel) {
            console.debug('entityType: ' + entityType.name);
        }
        for (let index = 0; index < realKeys.length; index++) {
            const keyItem = realKeys[index];
            let prpGenType: GenericNode = GenericTokenizer.resolveNode(entityObj, keyItem);
            if (!prpGenType) {
                if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                    console.debug('GenericNode not found for property key \'' + keyItem + '\' of ' + entityType.name);
                }
            } else if (prpGenType.gType !== LazyRefMTO) {
                if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                    console.debug('GenericNode found but it is not a LazyRef. Property key \'' + keyItem + '\' of ' + entityType.name);
                }
            } else {
                let lazyRefGenericParam: Type<any> = null;
                if (prpGenType.gParams.length > 0) {
                    if (prpGenType.gParams[0] instanceof GenericNode) {
                        lazyRefGenericParam = (prpGenType.gParams[0] as GenericNode).gType;
                    } else {
                        lazyRefGenericParam = (prpGenType.gParams[0] as Type<any>);
                    }

                    if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                        console.debug('GenericNode found and it is a LazyRef, lazyRefGenericParam: ' + lazyRefGenericParam.name + ' . Property key \'' + keyItem + '\' of ' + entityType.name);
                    }

                    if (this.isCollection(lazyRefGenericParam)) {
                        if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                            console.debug('GenericNode found, it is a LazyRef, and it is a Collection, lazyRefGenericParam: ' + lazyRefGenericParam.name + ' . Property key \'' + keyItem + '\' of ' + entityType.name);
                        }
                        let lazyRefSet: LazyRefBase<any, any> = new LazyRefBase<any, any>();
                        lazyRefSet.internalSetLazyObjForCollection(this.createCollection(lazyRefGenericParam, entityObj, keyItem));
                        lazyRefSet.refererObj = entityObj;
                        lazyRefSet.refererKey = keyItem;
                        lazyRefSet.session = this;
                        lodashSet(entityObj, keyItem, lazyRefSet);
                    } else {
                        if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                            console.debug('GenericNode found, it is a LazyRef, and it is not a Collection, lazyRefGenericParam: ' + lazyRefGenericParam.name + ' . Property key \'' + keyItem + '\' of ' + entityType.name);
                        }
                        let lazyRef: LazyRefBase<any, any> = new LazyRefBase<any, any>();
                        lazyRef.refererObj = entityObj;
                        lazyRef.refererKey = keyItem;
                        lazyRef.session = this;
                        lodashSet(entityObj, keyItem, lazyRef);
                    }
                } else {
                    throw new Error('Property \'' + keyItem + ' of \'' + entityObj.constructor + '\'. LazyRef not properly defined on Reflect');
                }
            }
        }

        if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            console.debug('isRecording, ');
        }

        this._objectsByCreationId.set(creationId, entityObj);
        let clazzOptions: NgJsHbDecorators.clazzOptions = Reflect.getMetadata(JsHbContants.JSHB_REFLECT_METADATA_JAVA_CLASS, entityType);
        if (!clazzOptions) {
            throw new Error('the classe \'' + entityType + ' is not using the decorator \'NgJsHbDecorators.clazz\'');
        }
        if (!this.isOnRestoreEntireStateFromLiteral()) {    
            this.storeOriginalLiteralEntry(
                {
                    method: 'newEntityInstance',
                    reflectFunctionMetadataTypeKey: NgJsHbDecorators.mountContructorByJavaClassMetadataKey(clazzOptions, entityType),
                    ref: {
                        creationId: creationId,
                        iAmAJsHbEntityRef: true
                    }
                });
        }
        
        lodashSet(entityObj, this.jsHbManager.jsHbConfig.jsHbCreationIdName, creationId);
        lodashSet(entityObj, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, this);

        if (!this.isOnRestoreEntireStateFromLiteral()) {
            //gravando o playback
            let action: JsHbPlaybackAction = new JsHbPlaybackAction();
            action.fieldName = null;
            action.actionType = JsHbPlaybackActionType.Create;
            
            action.ownerJavaClass = Reflect.getMetadata(JsHbContants.JSHB_REFLECT_METADATA_JAVA_CLASS, entityObj.constructor);
            if (!action.ownerJavaClass) {
                throw new Error('the classe \'' + entityType + ' is not using the decorator \'NgJsHbDecorators.clazz\'');
            }
            action.ownerCreationId = this._nextCreationId;
        }

        return entityObj;
    }

    public newEntityInstance<T extends object>(entityType: Type<T>): T {
        if (!this.isRecording()){
            throw new Error('Invalid operation. It is not recording.');
        }

        let newEntityReturn: T = this.newEntityInstanceWithCreationId<T>(entityType, this._nextCreationId);

        this._nextCreationId++;
        return newEntityReturn;
    }

    public startRecord(): void {
        if (JsHbLogLevel.Debug >= this.jsHbManager.jsHbConfig.logLevel) {
            console.debug('reseting  this._currentJsHbPlayback, this._objectsCreationId and this._nextCreationId');
        }
        this._currentJsHbPlayback = new JsHbPlayback();
        this._nextCreationId = 1;
    }

    public stopRecord(): void {
        if (this.isRecording()) {
            if (JsHbLogLevel.Debug >= this.jsHbManager.jsHbConfig.logLevel) {
                console.debug('updating this.lastJsHbPlayback and resetting this.currentJsHbPlayback');
            }
            this._latestJsHbPlayback.push(this._currentJsHbPlayback);
            this._currentJsHbPlayback = null;
        } else {
            if (JsHbLogLevel.Debug >= this.jsHbManager.jsHbConfig.logLevel) {
                console.debug('nothing, it is not recording now');
            }
        }
    }
    
    public recordSave(entity: any): void {
        if (!entity){
            throw new Error('entity can not be null');
        }
        if (!this.isRecording()){
            throw new Error('Invalid operation. It is not recording. entity: \'' + entity.constructor.name + '\'');
        }
        let session: IJsHbSession = lodashGet(entity, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME) as IJsHbSession;
        if (!session) {
            throw new Error('Invalid operation. \'' + entity.constructor.name + '\' not managed. \'' + JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME + '\' estah null');
        } else if (session !== this) {
            throw new Error('Invalid operation. \'' + entity.constructor.name + '\' managed by another session.');
        }
        //gravando o playback
        let action: JsHbPlaybackAction = new JsHbPlaybackAction();
        action.actionType = JsHbPlaybackActionType.Save;
        if (lodashHas(entity, this.jsHbManager.jsHbConfig.jsHbSignatureName)) {
            throw new Error('Invalid operation. \'' + entity.constructor + '\' has a signature, that is, it has persisted');
        } else if (lodashHas(entity, this.jsHbManager.jsHbConfig.jsHbCreationIdName)) {
            action.ownerCreationRefId = lodashGet(entity, this.jsHbManager.jsHbConfig.jsHbCreationIdName) as number;
        } else {
            throw new Error('Invalid operation. Not managed entity. Entity: \'' + entity.constructor + '\'');
        }
        if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            console.group('action: ');
            console.debug(action);
            console.groupEnd();
        }
        this.addPlaybackAction(action);
    }

    public recordDelete(entity: any): void {
        if (!entity){
            throw new Error('Entity nao pode ser nula');
        }
        if (!this.isRecording()){
            throw new Error('Invalid operation. Nao estah gravando. Entity: \'' + entity.constructor + '\'');
        }
        let session: IJsHbSession = lodashGet(entity, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME) as IJsHbSession;
        if (!session) {
            throw new Error('Invalid operation. \'' + entity.constructor + '\' not managed. \'' + JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME + '\' estah null');
        } else if (session !== this) {
            throw new Error('Invalid operation. \'' + entity.constructor + '\' managed by another session.');
        }
        //gravando o playback
        let action: JsHbPlaybackAction = new JsHbPlaybackAction();
        action.actionType = JsHbPlaybackActionType.Delete;
        if (lodashHas(entity, this.jsHbManager.jsHbConfig.jsHbSignatureName)) {
            action.ownerSignatureStr = lodashGet(entity, this.jsHbManager.jsHbConfig.jsHbSignatureName) as string;
        } else if (lodashHas(entity, this.jsHbManager.jsHbConfig.jsHbCreationIdName)) {
            throw new Error('Invalid operation. \'' + entity.constructor + '\' has id of creation, that is, is not persisted.');
        } else {
            throw new Error('Invalid operation. Not managed entity. Entity: \'' + entity.constructor + '\'');
        }
        if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            console.debug('action: ' + action);
        }
        this.addPlaybackAction(action);
    }

    public storeOriginalLiteralEntry(originalValueEntry: OriginalLiteralValueEntry): void {
        this._originalLiteralValueEntries.push(originalValueEntry);
    }

    public clear(): void {
        if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            console.debug('clearing: this.objectsBySignature, this.objectsCreationId, this.nextCreationId, this.currentJsHbPlayback, this.lastJsHbPlayback and this.objectsBySignature');
        }
        this._objectsBySignature = null;
        this._objectsByCreationId = null;
        this._originalLiteralValueEntries = null;
        this._nextCreationId = null;
        this._currentJsHbPlayback = null;
        this._latestJsHbPlayback = null;
        this._objectsBySignature = new Map();
        this._objectsByCreationId = new Map();
        this._originalLiteralValueEntries = [];
        this._latestJsHbPlayback = [];
    }

    public getLastRecordedPlayback(): JsHbPlayback {
        return this._latestJsHbPlayback.length > 0? this._latestJsHbPlayback[this._latestJsHbPlayback.length - 1] : null;
    }

    public addPlaybackAction(action: JsHbPlaybackAction): void {
        if (!this.isRecording()) {
            throw new Error('Nao iniciou a gravacao!');
        }
        if (JsHbLogLevel.Debug >= this.jsHbManager.jsHbConfig.logLevel) {
            console.group('addPlaybackAction');
            console.debug(action as any as string);
            console.groupEnd();
        }

        this._currentJsHbPlayback.actions.push(action);
    }

    public isRecording(): boolean {
        return (this._currentJsHbPlayback != null);
    }

    public getLastRecordedPlaybackAsLiteral(): any {
        const result: any = this.getPlaybackAsLiteral(this.getLastRecordedPlayback());
        if (JsHbLogLevel.Debug >= this.jsHbManager.jsHbConfig.logLevel) {
            console.group('getLastRecordedPlaybackAsLiteral');
            console.debug(result as any as string);
            console.groupEnd();
        }
        return result;
    }

    private getPlaybackAsLiteral(playback: JsHbPlayback): any {
        const literalReturn: any = JSONHelper.convertToLiteralObject(playback, true)
        if (JsHbLogLevel.Debug >= this.jsHbManager.jsHbConfig.logLevel) {
            console.group('getPlaybackAsLiteral');
            console.debug(literalReturn as any as string);
            console.groupEnd();
        }
        return literalReturn;
    }

    private getPlaybackFromLiteral(playbackLiteral: any): JsHbPlayback {
        const playBackReturn: JsHbPlayback = new JsHbPlayback();
        playBackReturn.actions = [];
        for (const actionLiteral of playbackLiteral.actions) {
            let action: JsHbPlaybackAction = new JsHbPlaybackAction();
            action = lodashMergeWith(
                action, 
                actionLiteral, 
                (value: any, srcValue: any) => {
                    return srcValue;
                }
            );
            playBackReturn.actions.push(action);
        }
        if (JsHbLogLevel.Debug >= this.jsHbManager.jsHbConfig.logLevel) {
            console.group('getPlaybackFromLiteral');
            console.debug(playBackReturn as any as string);
            console.groupEnd();
        }
        return playBackReturn;
    }

    public getCachedBySignature<T extends object>(signatureStr: string): T {
        if (this._objectsBySignature.get(signatureStr)) {
            return this._objectsBySignature.get(signatureStr);
        } else {
            return null;
        }
    }

    private validatingControlFieldsExistence(entityType: Type<any>): void {
        const camposControleArr = [
            this.jsHbManager.jsHbConfig.jsHbCreationIdName,
            this.jsHbManager.jsHbConfig.jsHbHibernateIdName,
            this.jsHbManager.jsHbConfig.jsHbIdName,
            this.jsHbManager.jsHbConfig.jsHbIdRefName,
            this.jsHbManager.jsHbConfig.jsHbIsLazyUninitializedName,
            this.jsHbManager.jsHbConfig.jsHbSignatureName,
            JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME,
            JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME];
        for (let index = 0; index < camposControleArr.length; index++) {
            const internalKeyItem = camposControleArr[index];
            if (Object.keys(entityType.prototype).lastIndexOf(internalKeyItem.toString()) >= 0) {
                throw new Error('The Entity ' + entityType.name + ' already has the property \'' + internalKeyItem.toString() + '\' defined!');
            }            
        }
    }

    public processJsHbResultEntityInternal<L>(entityType: Type<L>, literalResultField: any): L {
        let refMap: Map<Number, any> = new Map();
        return this.processJsHbResultEntityPriv(entityType, literalResultField, refMap);
    }

    private processJsHbResultEntityPriv<L>(entityType: Type<L>, body: any, refMap: Map<Number, any>): L {
        let signatureStr: string = <string>lodashGet(body, this.jsHbManager.jsHbConfig.jsHbSignatureName);
        let entityValue: any = this._objectsBySignature.get(signatureStr);
        if (!entityValue) {
            let jsHbIdRef: Number = <Number>lodashGet(body, this.jsHbManager.jsHbConfig.jsHbIdRefName);
            if (jsHbIdRef) {
                entityValue = refMap.get(jsHbIdRef);
            }
        }
        
        if (!entityValue) {
            if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                console.debug('entity not processed yet on this session. Not found by signature: ' + signatureStr);
            }
            this.validatingControlFieldsExistence(entityType);
            entityValue = new entityType();
            // if (signatureStr) {
            //     this._objectsBySignature.set(signatureStr, entityValue);
            // }
            lodashSet(entityValue, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, this);
            this.removeNonUsedKeysFromLiteral(entityValue, body);

            if (lodashHas(body, this.jsHbManager.jsHbConfig.jsHbIdName)) {
                refMap.set(<Number>lodashGet(body, this.jsHbManager.jsHbConfig.jsHbIdName), entityValue);
            } else {
                throw new Error('This should not happen 1');
            }

            lodashSet(entityValue, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, true);
            try {
                this.tryCacheInstanceBySignature(
                    {
                        realInstance: entityValue, 
                        literalJsHbResult: body
                    }
                );
                lodashMergeWith(entityValue, body, this.mergeWithCustomizerPropertyReplection(refMap));
            } finally {
                lodashSet(entityValue, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, false);
            }
        } else {
            if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                console.debug('entity already processed on this session. Found by signature: ' + signatureStr);
            }
        }
        return entityValue;
    }

    private createLoadedLazyRef<L extends object, I>(genericNode: GenericNode, literalLazyObj: any, refMap: Map<Number, any>, refererObj: any, refererKey: string): LazyRefMTO<L, I> {
        let lr: LazyRefBase<L, I> = this.createApropriatedLazyRefBase<L, I>(genericNode, literalLazyObj, refererObj, refererKey);
        
        this.trySetHibernateIdentifier(lr, genericNode, literalLazyObj, refMap);
        this.tryGetFromObjectsBySignature(lr, literalLazyObj);

        if (lr.lazyLoadedObj) {
            if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                console.group('LazyRef.lazyLoadedObj is already setted: ');
                console.debug(lr.lazyLoadedObj);
                console.groupEnd();
            }
        } else {
            if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                console.debug('LazyRef.lazyLoadedObj is not setted yet');
            }
            let lazyLoadedObjType: Type<any> = null;
            if (genericNode.gParams[0] instanceof GenericNode) {
                lazyLoadedObjType = (<GenericNode>genericNode.gParams[0]).gType;
            } else {
                lazyLoadedObjType = <Type<any>>genericNode.gParams[0];
            }
            
            lr.lazyLoadedObj = null;
            if (this.isCollection(lazyLoadedObjType)) {
                if (!(genericNode.gParams[0] instanceof GenericNode) || (<GenericNode>genericNode.gParams[0]).gParams.length <=0) {
                    throw new Error('LazyRef nao definido corretamente: \'' + refererKey + '\' em ' + refererObj.constructor);
                }
                let collTypeParam: Type<any> =  null;
                if ((<GenericNode>genericNode.gParams[0]).gParams[0] instanceof GenericNode) {
                    collTypeParam = (<GenericNode>(<GenericNode>genericNode.gParams[0]).gParams[0]).gType;
                } else {
                    collTypeParam = <Type<any>>(<GenericNode>genericNode.gParams[0]).gParams[0];
                }

                lr.lazyLoadedObj = this.createCollection(lazyLoadedObjType, refererObj, refererKey);
                for (const {} of literalLazyObj) {
                    // let realItem = new collTypeParam();
                    // this.tryCacheInstanceBySignature(lr.lazyLoadedObj, literalLazyObj);
                    // lodashMergeWith(realItem, literalItem, this.mergeWithCustomizerPropertyReplection(refMap));
                    let realItem = this.processJsHbResultEntityPriv(collTypeParam, literalLazyObj, refMap);
                    this.addOnCollection(lr.lazyLoadedObj, realItem);
                }
            } else {
                // lr.lazyLoadedObj = new lazyLoadedObjType(); 
                // lodashSet(lr.lazyLoadedObj, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, this);
                // lodashSet(lr.lazyLoadedObj, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, true);
                // this.removeNonUsedKeysFromLiteral(lr.lazyLoadedObj, literalLazyObj);
                // try {
                //     this.tryCacheInstanceBySignature(lr.lazyLoadedObj, literalLazyObj);
                //     lodashMergeWith(lr.lazyLoadedObj, literalLazyObj, this.mergeWithCustomizerPropertyReplection(refMap));
                // } finally {
                //     lodashSet(lr.lazyLoadedObj, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, false);
                // }
                lr.lazyLoadedObj = this.processJsHbResultEntityPriv(lazyLoadedObjType, literalLazyObj, refMap);
            }

            // if (lr.signatureStr) {
            //     this._objectsBySignature.set(lr.signatureStr, lr.lazyLoadedObj);
            // }
        }
        return lr;
    }

    public tryCacheInstanceBySignature(
            tryOptions:
                {
                    realInstance: any,
                    literalJsHbResult: {result: any},
                    lazySignature?: string
                }): void {
        let signatureStr: string = <string>lodashGet(tryOptions.literalJsHbResult, this.jsHbManager.jsHbConfig.jsHbSignatureName);
        if (signatureStr) {
            this._objectsBySignature.set(signatureStr, tryOptions.realInstance);
        }
        if (tryOptions.lazySignature) {
            this._objectsBySignature.set(tryOptions.lazySignature, tryOptions.realInstance);
        }
    }


    private createNotLoadedLazyRef<L extends object, I>(genericNode: GenericNode, literalLazyObj: any, refMap: Map<Number, any>, refererObj: any, refererKey: string): LazyRefMTO<L, I> {
        let lr: LazyRefBase<L, I> = this.createApropriatedLazyRefBase<L, I>(genericNode, literalLazyObj, refererObj, refererKey);
        this.trySetHibernateIdentifier(lr, genericNode, literalLazyObj, refMap);
        this.tryGetFromObjectsBySignature(lr, literalLazyObj);

        if (lr.lazyLoadedObj) {
            if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                console.group('LazyRef.lazyLoadedObj is already setted: ');
                console.debug(lr.lazyLoadedObj);
                console.groupEnd();
            }
        } else {
            lr.respObs = this.jsHbManager.httpLazyObservableGen.generateHttpObservable(lr.signatureStr)
                .pipe(
                    //Em caso de erro, isso permitira que possa tentar novamente
                    catchError((err) => {
                        lr.respObs = this.jsHbManager.httpLazyObservableGen.generateHttpObservable(lr.signatureStr);
                        return throwError(err);
                    })
                );
            // lr.flatMapCallback = 
            //     (response) => {
            //         if (lr.lazyLoadedObj == null) {
            //             if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            //                 console.group('createNotLoadedLazyRef => lr.flatMapCallback: LazyRef.lazyLoadedObj is not setted yet: ');
            //                 console.debug(lr.lazyLoadedObj);
            //                 console.groupEnd();
            //             }
            //             let literalLazyObj: any = response.body;
            //             //literal.result
            //             if (genericNode.gType !== LazyRefMTO) {
            //                 throw new Error('Wrong type: ' + genericNode.gType.name);
            //             }
            //             let lazyLoadedObjType: Type<any> = null;
            //             if (genericNode.gParams[0] instanceof GenericNode) {
            //                 lazyLoadedObjType = (<GenericNode>genericNode.gParams[0]).gType;
            //             } else {
            //                 lazyLoadedObjType = <Type<any>>genericNode.gParams[0];
            //             }
            //             if (this.isCollection(lazyLoadedObjType)) {
            //                 if (!(genericNode.gParams[0] instanceof GenericNode) || (<GenericNode>genericNode.gParams[0]).gParams.length <=0) {
            //                     throw new Error('LazyRef not defined: \'' + refererKey + '\' em ' + refererObj.constructor.name);
            //                 }
            //                 if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            //                     console.debug('createNotLoadedLazyRef => lr.flatMapCallback: LazyRef is collection: ' + lazyLoadedObjType.name);
            //                 }
            //                 let collTypeParam: Type<any> =  null;
            //                 if ((<GenericNode>genericNode.gParams[0]).gParams[0] instanceof GenericNode) {
            //                     collTypeParam = (<GenericNode>(<GenericNode>genericNode.gParams[0]).gParams[0]).gType;
            //                 } else {
            //                     collTypeParam = <Type<any>>(<GenericNode>genericNode.gParams[0]).gParams[0];
            //                 }
            //                 if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            //                     console.debug('createNotLoadedLazyRef => lr.flatMapCallback: LazyRef is collection of: ' + collTypeParam.name);
            //                 }

            //                 lr.lazyLoadedObj = this.createCollection(lazyLoadedObjType, refererObj, refererKey);
            //                 for (const literalItem of literalLazyObj.result) {
            //                     // let realItem = new collTypeParam();
            //                     // lodashSet(realItem, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, this);
            //                     // this.removeNonUsedKeysFromLiteral(realItem, literalItem);
            //                     // lodashSet(realItem, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, true);
            //                     // try {
            //                     //     lodashMergeWith(realItem, literalItem, this.mergeWithCustomizerPropertyReplection(refMap));
            //                     // } finally {
            //                     //     lodashSet(lr.lazyLoadedObj, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, false);
            //                     // }                                
            //                     let realItem = this.processJsHbResultEntityPriv(collTypeParam, literalItem, refMap);

            //                     this.addOnCollection(lr.lazyLoadedObj, realItem);
            //                 }
            //             } else {
            //                 // lr.lazyLoadedObj = new lazyLoadedObjType();
            //                 // if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            //                 //     console.debug('createNotLoadedLazyRef => lr.flatMapCallback: LazyRef is not collection: ' + lazyLoadedObjType.name);
            //                 // }
            //                 // lodashSet(lr.lazyLoadedObj, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, this);
            //                 // this.removeNonUsedKeysFromLiteral(lr.lazyLoadedObj, literalLazyObj.result);
            //                 // lodashSet(lr.lazyLoadedObj, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, true);
            //                 // try {
            //                 //     lodashMergeWith(lr.lazyLoadedObj, literalLazyObj.result, this.mergeWithCustomizerPropertyReplection(refMapFlatMapCallback));            
            //                 // } finally {
            //                 //     lodashSet(lr.lazyLoadedObj, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, false);
            //                 // }
            //                 lr.lazyLoadedObj = this.processJsHbResultEntityPriv(lazyLoadedObjType, literalLazyObj.result, refMap);
            //                 let persistentOriginalValueItem: PersistentOriginalValueEntry;
            //                 //foi a unica forma que encontrei de desacoplar o Observable<L> do Observable<Response>
            //                 // O efeito colateral disso eh que qualquer *Map() chamado antes dessa troca fica
            //                 // desatachado do novo Observable.
            //             }
            //         }
            //         if (lr.signatureStr) {
            //             if (!this.isOnRestoreEntireStateFromLiteral()) {
            //                 if (!lodashHas(lr.refererObj, this.jsHbManager.jsHbConfig.jsHbSignatureName)) {
            //                     throw new Error('The referer object has no '+ this.jsHbManager.jsHbConfig.jsHbSignatureName + ' key. This should not happen.');
            //                 }
            //                 let ownerSignatureStr = lodashGet(lr.refererObj, this.jsHbManager.jsHbConfig.jsHbSignatureName);
            //                 this.storeOriginalLiteralResult(
            //                     {
            //                         method: 'lazyRef',
            //                         literalValue: literalLazyObj,
            //                         ownerSignatureStr: ownerSignatureStr,
            //                         ownerFieldName: lr.refererKey
            //                     }
            //                 );
            //             }
            //             if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
            //                 console.group('createNotLoadedLazyRef => lr.flatMapCallback: keeping reference by signature ' + lr.signatureStr);
            //                 console.debug(lr.lazyLoadedObj);
            //                 console.groupEnd();
            //             }
            //             this.tryCacheInstanceBySignature(lr.lazyLoadedObj, literalLazyObj);
            //             // this._objectsBySignature.set(lr.signatureStr, lr.lazyLoadedObj);
            //         }
            //         return of(lr.lazyLoadedObj);
            //     };
        }
        return lr;
    }

    private tryGetFromObjectsBySignature<L extends object, I>(lr: LazyRefBase<L, I>, literalLazyObj: any) {
        let signatureStr: string = <string>lodashGet(literalLazyObj, this.jsHbManager.jsHbConfig.jsHbSignatureName);

        let entityValue: any = null;
        if (signatureStr) {
            lr.signatureStr = signatureStr;
            entityValue = this._objectsBySignature.get(signatureStr);
        } else {
        }

        if (entityValue) {
            lr.lazyLoadedObj = entityValue;
        } else {
            //nada
        }
    }

    public createApropriatedLazyRefBase<L extends object, I>(genericNode: GenericNode, literalLazyObj: any, refererObj: any, refererKey: string): LazyRefBase<L, I> {
        let jsHbHibernateIdLiteral: any = lodashGet(literalLazyObj, this.jsHbManager.jsHbConfig.jsHbHibernateIdName);
        let lazyRef: LazyRefBase<L, any> = null;
        if (jsHbHibernateIdLiteral) {
            lazyRef = new LazyRefBase<L, I>();
        } else {
            lazyRef = new LazyRefBase<L, undefined>();
        }
        lazyRef.refererObj = refererObj;
        lazyRef.refererKey = refererKey;
        lazyRef.session = this;
        lazyRef.genericNode = genericNode;
        return lazyRef;
    }

    private metadaKeys: Set<string>;
    private isMetadataKey(keyName: string): boolean {
        if (this.metadaKeys == null) {
            this.metadaKeys = new Set<string>()
                .add(this.jsHbManager.jsHbConfig.jsHbHibernateIdName)
                .add(this.jsHbManager.jsHbConfig.jsHbIdName)
                .add(this.jsHbManager.jsHbConfig.jsHbIdRefName)
                .add(this.jsHbManager.jsHbConfig.jsHbIsLazyUninitializedName)
                .add(this.jsHbManager.jsHbConfig.jsHbSignatureName);
        }
        return this.metadaKeys.has(keyName);
    }

    private removeNonUsedKeysFromLiteral<L extends object>(realObj: L, literalObj: any) {
        let literalKeys: string[] = lodashClone(lodashKeys(literalObj));
        let realKeys: string[] = Object.keys(Object.getPrototypeOf(realObj));
        for (let index = 0; index < literalKeys.length; index++) {
            const keyItem = literalKeys[index];
            if (!this.isMetadataKey(keyItem) && realKeys.indexOf(keyItem) < 0) {
                delete literalObj[keyItem];
            }
        }
    }

    private trySetHibernateIdentifier<L extends object, I>(lr: LazyRefBase<L, I>, genericNode: GenericNode, literalLazyObj: any, refMap: Map<Number, any>): void {
        let jsHbHibernateIdLiteral: any = lodashGet(literalLazyObj, this.jsHbManager.jsHbConfig.jsHbHibernateIdName);
        if (jsHbHibernateIdLiteral instanceof Object && !(jsHbHibernateIdLiteral instanceof Date)) {
            let hbIdType: Type<any> = null;
            if (genericNode.gParams[1] instanceof GenericNode) {
                hbIdType = (<GenericNode>genericNode.gParams[1]).gType;
            } else {
                hbIdType = <Type<any>>genericNode.gParams[1];
            }
            if (hbIdType) {
                if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                    console.group('There is a hbIdType on LazyRef. Is it many-to-one LazyRef?!. hbIdType: ' + hbIdType.name + ', genericNode:');
                    console.debug(genericNode);
                    console.groupEnd();
                }
                this.validatingControlFieldsExistence(hbIdType);
                // lr.hbId = new hbIdType();
                // lodashSet(lr.hbId, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, this);
                // this.removeNonUsedKeysFromLiteral(lr.hbId, jsHbHibernateIdLiteral);
                // lodashMergeWith(lr.hbId, jsHbHibernateIdLiteral, this.mergeWithCustomizerPropertyReplection(refMap));
                lr.hbId = this.processJsHbResultEntityPriv(hbIdType, jsHbHibernateIdLiteral, refMap);
            } else {
                if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                    console.group('Thre is no hbIdType on LazyRef. Is it a collection?!. hbIdType: ' + hbIdType.name + ', genericNode:');
                    console.debug(genericNode);
                    console.groupEnd();
                }
            }
        } else if (jsHbHibernateIdLiteral) {
            if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                console.group('The hibernate id is a simple type value: ' + jsHbHibernateIdLiteral + '. genericNode:');
                console.debug(genericNode);
                console.groupEnd();
            }
            lr.hbId = jsHbHibernateIdLiteral;
        } else {
            if (JsHbLogLevel.Trace >= this.jsHbManager.jsHbConfig.logLevel) {
                console.group('The hibernate id is null! Is it a collection?!: ' + jsHbHibernateIdLiteral + '. genericNode:');
                console.debug(genericNode);
                console.groupEnd();
            }
        }
    }

    public createCollection(collType: Type<any>, refererObj: any, refererKey: string): any {
        if (collType === Set) {
            //return new JsHbSet(this, refererObj, refererKey);
            return new JsHbSetCreator(this, refererObj, refererKey).createByProxy();
        } else {
            throw new Error('Collection not supported: ' + collType);
        }
    }

    public isCollection(typeTested: Type<any>): any {
        return (typeTested === Array)
                || (typeTested === Set);
    }

    public addOnCollection(collection: any, element: any) {
        if (collection instanceof Array) {
            throw new Error('Colecction nao suportada: ' + (collection as any).prototype);
        } else if (collection instanceof Set){
            (<Set<any>>collection).add(element);
        } else {
            throw new Error('Colecction nao suportada: ' + collection.prototype);
        }
    }
    public removeFromCollection(collection: any, element: any) {
        if (collection instanceof Array) {
            throw new Error('Colecction nao suportada: ' + (collection as any).prototype);
        } else if (collection instanceof Set){
            (<Set<any>>collection).delete(element);
        } else {
            throw new Error('Colecction nao suportada: ' + collection.prototype);
        }
    }

    private mergeWithCustomizerPropertyReplection(refMap: Map<Number, any>): MergeWithCustomizer {
        let thisLocal: JsHbSessionDefault = this;
        return function (value: any, srcValue: any, key?: string, object?: Object, source?: Object) {
            if (JsHbLogLevel.Trace >= thisLocal.jsHbManager.jsHbConfig.logLevel) {
                console.group('mergeWithCustomizerPropertyReplection => function');
                console.debug(refMap); console.debug(value); console.debug(srcValue); console.debug(key); console.debug(object); console.debug(source);
                console.groupEnd();
            }
            let prpType: Type<any> = Reflect.getMetadata('design:type', object, key);
            let prpGenType: GenericNode = GenericTokenizer.resolveNode(object, key);
            let isJsHbHibernateIdAndIsObject: boolean = false;
            let isHibernateComponent: boolean = false;
            if (!prpType && srcValue instanceof Object && !(srcValue instanceof Date) && key === thisLocal.jsHbManager.jsHbConfig.jsHbHibernateIdName) {
                isJsHbHibernateIdAndIsObject = true;
                if (JsHbLogLevel.Trace >= thisLocal.jsHbManager.jsHbConfig.logLevel) {
                    console.group('mergeWithCustomizerPropertyReplection => function: (!prpType && srcValue instanceof Object && !(srcValue instanceof Date) && key === thisLocal.jsHbManager.jsHbConfig.jsHbHibernateIdName)');
                    console.debug(srcValue);
                    console.groupEnd();
                }
                prpType = Reflect.getMetadata(JsHbContants.JSHB_REFLECT_METADATA_HIBERNATE_ID_TYPE, object);
                if (!prpType) {
                    throw new Error('We are receiving ' +thisLocal.jsHbManager.jsHbConfig.jsHbHibernateIdName + ' as Object and ' + object.constructor.name + ' does not define a property with @NgJsHbDecorators.hibernateId()');
                }
            } else if (srcValue instanceof Object && !(srcValue instanceof Date) && prpGenType && prpGenType.gType !== LazyRefMTO) {
                isHibernateComponent = true;
            }
            let correctSrcValue = srcValue;
            let jsHbIdRef: Number = <Number>lodashGet(srcValue, thisLocal.jsHbManager.jsHbConfig.jsHbIdRefName);
            if (jsHbIdRef) {
                correctSrcValue = refMap.get(jsHbIdRef);
                if (!correctSrcValue) {
                    throw new Error('This should not happen 2');
                }
                if (JsHbLogLevel.Trace >= thisLocal.jsHbManager.jsHbConfig.logLevel) {
                    console.group('mergeWithCustomizerPropertyReplection => function. Object resolved by ' + thisLocal.jsHbManager.jsHbConfig.jsHbIdRefName + ' field');
                    console.debug(correctSrcValue);
                    console.groupEnd();
                }
            } else if (isJsHbHibernateIdAndIsObject || isHibernateComponent) {
                if (JsHbLogLevel.Trace >= thisLocal.jsHbManager.jsHbConfig.logLevel) {
                    console.group('mergeWithCustomizerPropertyReplection => function: (isJsHbHibernateIdAndIsObject)');
                    console.debug(srcValue);
                    console.groupEnd();
                }
                // correctSrcValue = new prpType(); 
                // lodashSet(correctSrcValue, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, this);
                // lodashSet(correctSrcValue, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, true);
                // this.removeNonUsedKeysFromLiteral(correctSrcValue, srcValue);
                // try {
                //     lodashMergeWith(correctSrcValue, srcValue, this.mergeWithCustomizerPropertyReplection(refMap));
                // } finally {
                //     lodashSet(correctSrcValue, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, false);
                // }
                correctSrcValue = thisLocal.processJsHbResultEntityPriv(prpType, srcValue, refMap);

                //here prpType 
            } else if (prpType) {
                if (prpGenType) {
                    if (thisLocal.isCollection(prpGenType.gType)) {
                        if (JsHbLogLevel.Trace >= thisLocal.jsHbManager.jsHbConfig.logLevel) {
                            console.group('mergeWithCustomizerPropertyReplection => function. thisLocal.isCollection(prpGenType.gType) ');
                            console.debug(prpGenType); console.debug(prpGenType.gType);
                            console.groupEnd();
                        }
                        let correctSrcValueColl = thisLocal.createCollection(prpGenType.gType, value, key);
                        for (let index = 0; index < srcValue.length; index++) { 
                            let arrItemType: Type<any> = <Type<any>>prpGenType.gParams[0];
                            // let correctSrcValueCollItem = arrItemType;
                            // thisLocal.removeNonUsedKeysFromLiteral(correctSrcValueCollItem, srcValue);
                            // lodashSet(correctSrcValueCollItem, JsHbContants.JSHB_ENTITY_SESION_PROPERTY_NAME, thisLocal);
                            // lodashSet(correctSrcValueCollItem, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, true);
                            // try {
                            //     lodashMergeWith(correctSrcValueCollItem, srcValue[index], thisLocal.mergeWithCustomizerPropertyReplection(refMap));
                            // } finally {
                            //     lodashSet(correctSrcValueCollItem, JsHbContants.JSHB_ENTITY_IS_ON_LAZY_LOAD_NAME, false);
                            // }
                            let correctSrcValueCollItem = thisLocal.processJsHbResultEntityPriv(arrItemType, srcValue[index], refMap);

                            thisLocal.addOnCollection(correctSrcValueColl, correctSrcValueCollItem);
                        }
                        correctSrcValue = correctSrcValueColl;
                        //nada por enquanto
                    } else if (prpGenType.gType === LazyRefMTO) {
                        // if (!lodashHas(source, thisLocal.jsHbManager.jsHbConfig.jsHbIsLazyUninitializedName)) {
                        //     throw new Error('Aqui deveria existir \'' + thisLocal.jsHbManager.jsHbConfig.jsHbIsLazyUninitializedName + '\'. ' + JSON.stringify(srcValue));
                        // }
                        if (!lodashHas(source, thisLocal.jsHbManager.jsHbConfig.jsHbIdName)) {
                            throw new Error('Aqui deveria existir \'' + thisLocal.jsHbManager.jsHbConfig.jsHbIdName + '\'. ' + JSON.stringify(srcValue));
                        }
                        let refId: Number = <Number>lodashGet(srcValue, thisLocal.jsHbManager.jsHbConfig.jsHbIdName);
                        if (lodashGet(srcValue, thisLocal.jsHbManager.jsHbConfig.jsHbIsLazyUninitializedName)) {
                            let lazyRef: LazyRefMTO<any, any> = thisLocal.createNotLoadedLazyRef(prpGenType, srcValue, refMap, object, key);
                            //there is no refId when 'jsHbIsLazyUninitialized'
                            //refMap.set(refId, lazyRef);
                            return lazyRef;
                        } else {
                            let lazyRef: LazyRefMTO<any, any> = thisLocal.createLoadedLazyRef(prpGenType, srcValue, refMap, object, key);
                            refMap.set(refId, lazyRef);
                            return lazyRef;
                        }
                    }
                } else if (srcValue instanceof Object && !(srcValue instanceof Date)){
                    throw new Error('This should not happen');
                } else {
                    if (JsHbLogLevel.Trace >= thisLocal.jsHbManager.jsHbConfig.logLevel) {
                        console.group('mergeWithCustomizerPropertyReplection => function. Transformation is not necessary for property \''+key+'\'.');
                        console.debug(object);
                        console.groupEnd();
                    }
                }
            } else if (lodashHas(object, key)) {
                throw new Error('Sem anotacao de tipo. key: ' + key + ', ' + value);
            } else if (!lodashHas(object, key) && !thisLocal.isMetadataKey(key)) {
                if (JsHbLogLevel.Trace >= thisLocal.jsHbManager.jsHbConfig.logLevel) {
                    console.debug('mergeWithCustomizerPropertyReplection => function. This property \''+key+'\' does not exists on this type.');
                }
                correctSrcValue = undefined;
            } else {
                if (JsHbLogLevel.Trace >= thisLocal.jsHbManager.jsHbConfig.logLevel) {
                    console.group('mergeWithCustomizerPropertyReplection => function. Property \''+key+'\'. Using same value.');
                    console.debug(correctSrcValue);
                    console.groupEnd();
                }
            }
            if (JsHbLogLevel.Trace >= thisLocal.jsHbManager.jsHbConfig.logLevel) {
                console.group('mergeWithCustomizerPropertyReplection => function. return');
                console.debug(correctSrcValue);
                console.groupEnd();
            }

            return correctSrcValue;
        }
    }
}