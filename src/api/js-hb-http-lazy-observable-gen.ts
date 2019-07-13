import { Observable } from "rxjs";
import { HttpResponseLike } from "../typeslike";
import { Stream } from "stream";
import { TypeLike } from "../typeslike";
import { GenericNode } from "./generic-tokenizer";
import { RecorderDecorators } from "./decorators";

export interface LazyInfo<L> {
	gNode: GenericNode
	propertyOptions: RecorderDecorators.PropertyOptions<L>,
	literalLazyObj: any,
	ownerType: TypeLike<any>,
	lazyFieldType: TypeLike<any>,
	fieldName: string
}

export interface IHttpResponseLazyObservableGen {
	generateHttpObservable(signatureStr: string, info: LazyInfo<any>): Observable<HttpResponseLike<Object>>;
	generateHttpObservableForDirectRaw(signatureStr: string, info: LazyInfo<any>): Observable<HttpResponseLike<Stream | any>>;
}