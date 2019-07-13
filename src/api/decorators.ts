import { RecorderDecoratorsInternal } from "../implementation/js-hb-decorators";
import { IFieldProcessor, IFieldProcessorEvents } from "./field-processor";
import { Stream } from "stream";
import { StringStreamMarker } from "./lazy-ref";

export namespace RecorderDecorators {
    /**
     * L: In case of LazyRef this is first type parameter of LazyRef.
     */
    export interface PropertyOptions<L> {
        persistent: boolean,
        lazyDirectRawRead?: boolean,
        lazyDirectRawWrite?: boolean,
        fieldProcessorResolver?: () => IFieldProcessor<L>,
        /** Framework internal use. */
        fieldProcessorEvents?: IFieldProcessorEvents<L>;
    }
    /**
     * Decorator for get property.  
     * \@JsonPlayback.property() is equivalent to \@JsonPlayback.property({persistent: true})
     * 
     * Examplo:
     * ```ts
       ...
       private _myField: string;
       @JsonPlayback.property()
       public get myField(): string {
         return this._myField;
       }
       public set myField(value: string) {
         this._myField = value;
       }
       ...
     * ```
     */
    export function property<T>(options: PropertyOptions<T>): MethodDecorator;
    export function property<T>(): MethodDecorator;
    export function property<T>(): MethodDecorator {
        let options: PropertyOptions<T> = { persistent: true };
        if (arguments.length > 0) {
            options = arguments[0];
        }
        return RecorderDecoratorsInternal.property(options);
    }

    export function playerObjectId<T>(): MethodDecorator {
        return RecorderDecoratorsInternal.playerObjectId();
    }

    /**
     * Used with {@link JsonPlayback#clazz}.
     */
    export interface clazzOptions {
        /**
         * Mapped java entity class.
         */
        javaClass: string;
        /**
         * Use it if you have more than one typescript classes mapping the same java entity class.
         */
        disambiguationId?: string;
    }

    /**
     * Decorator for persistent entity.
     * 
     * Sample:
     * ```ts
     * ...
     * @JsonPlayback.clazz({javaClass: 'org.mypackage.MyPersistentEntity'})
     * export class MyPersistentEntityJs {
     * ...
     * ```
     */
    export function clazz<T>(options: clazzOptions): ClassDecorator {
        return RecorderDecoratorsInternal.clazz(options);
    }

    export const BufferProcessor = RecorderDecoratorsInternal.BufferProcessor;
    export const StringProcessor = RecorderDecoratorsInternal.StringProcessor;
    export const StreamProcessor = RecorderDecoratorsInternal.StreamProcessor;
    export const StringStreamProcessor = RecorderDecoratorsInternal.StringStreamProcessor;

    export const TypeProcessorEntries = 
    [ 
        {
            type: Buffer,
            processor: RecorderDecoratorsInternal.BufferProcessor
        },
        {                
            type: String,
            processor: RecorderDecoratorsInternal.StringProcessor
        },
        {                
            type: Stream,
            processor: RecorderDecoratorsInternal.StreamProcessor
        },
        {
            type: StringStreamMarker,
            processor: RecorderDecoratorsInternal.StringStreamProcessor
        }
    ];
}