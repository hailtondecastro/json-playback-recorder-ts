import { Observable } from "rxjs";
import { TypeLike, ResponseLike } from '../typeslike';
import { GenericNode } from "../api/generic-tokenizer";
import { RecorderDecorators } from "../api/recorder-decorators";
import { FieldInfo } from "../api/recorder-config";
import { LazyRef } from "../api/lazy-ref";
import { LazyRefPrpMarker } from "../api/lazy-ref";

export interface IFieldProcessorCaller<P> {
    callFromLiteralValue?(value: any, info: FieldInfo): P;
    callFromRecordedLiteralValue?(value: any, info: FieldInfo): P;
    callFromDirectRaw?(rawValue: Observable<ResponseLike<NodeJS.ReadableStream>>, info: FieldInfo): Observable<ResponseLike<P>>;
    callToLiteralValue?(value: P, info: FieldInfo): any;
    callToDirectRaw?(value: P, info: FieldInfo): Observable<ResponseLike<NodeJS.ReadableStream>>;
}

export interface FieldEtc<P, GP> {
    prpType: TypeLike<P>,
    prpGenType: GenericNode,
    objectIdPrpType: TypeLike<any>,
    lazyLoadedObjType: TypeLike<P>,
    otmCollectionType?: TypeLike<any>,
    lazyRefMarkerType?: TypeLike<LazyRef<any, any>> | TypeLike<LazyRefPrpMarker>,
    propertyOptions: RecorderDecorators.PropertyOptions<P>,
    fieldProcessorCaller: IFieldProcessorCaller<P>,
    fieldInfo: FieldInfo
}