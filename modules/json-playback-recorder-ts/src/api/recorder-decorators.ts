import { RecorderDecoratorsInternal } from "../implementation/recorder-decorators-internal";
import { IFieldProcessor, IFieldProcessorEvents } from "./field-processor";
import { StringStreamMarker, BinaryStreamMarker, BinaryStream, StringStream } from "./lazy-ref";

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
     * \@RecorderDecorators.property() is equivalent to \@RecorderDecorators.property({persistent: true})
     * 
     * Examplo:
     * ```ts
       ...
       private _myField: string;
       @RecorderDecorators.property()
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
     * Used with {@link RecorderDecorators#playerType}.
     */
    export interface playerTypeOptions {
        /**
         * Mapped player side class type.
         */
        playerType: string;
        /**
         * Use it if you have more than one typescript classes mapping the same player side class type.
         */
        disambiguationId?: string;
    }

    /**
     * Decorator for persistent entity.
     * 
     * Sample:
     * ```ts
     * ...
     * @JsonPlayback.playerType({playerType: 'org.mypackage.MyPersistentEntity'})
     * export class MyPersistentEntityJs {
     * ...
     * ```
     */
    export function playerType<T>(options: playerTypeOptions): ClassDecorator {
        return RecorderDecoratorsInternal.playerType(options);
    }

    export const DateProcessor: IFieldProcessor<Date> = RecorderDecoratorsInternal.DateProcessor;
    export const BufferProcessor: IFieldProcessor<Buffer> = RecorderDecoratorsInternal.BufferProcessor;
    export const StringProcessor: IFieldProcessor<String> = RecorderDecoratorsInternal.StringProcessor;
    export const BinaryStreamProcessor: IFieldProcessor<BinaryStream> = RecorderDecoratorsInternal.BinaryStreamProcessor;
    export const StringStreamProcessor: IFieldProcessor<StringStream> = RecorderDecoratorsInternal.StringStreamProcessor;

    export const TypeProcessorEntries = 
    [ 
        {
            type: Buffer,
            processor: BufferProcessor
        },
        {                
            type: String,
            processor: StringProcessor
        },
        {                
            type: BinaryStreamMarker,
            processor: BinaryStreamProcessor
        },
        {
            type: StringStreamMarker,
            processor: StringStreamProcessor
        },
        {
            type: Date,
            processor: DateProcessor
        }
    ];
}