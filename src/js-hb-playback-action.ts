export enum JsHbPlaybackActionType {
    Create = <any>'CREATE',
    Save = <any>'SAVE',
    Delete = <any>'DELETE',
    SetField = <any>'SET_FIELD',
    CollectionAdd = <any>'COLLECTION_ADD',
    CollectionRemove = <any>'COLLECTION_REMOVE',
}

export class JsHbPlaybackAction {
    private _ownerSignatureStr: string;
    private _ownerCreationId: number;
    private _ownerCreationRefId: number;
    private _settedSignatureStr: string;
    private _settedCreationRefId: number;
    private _ownerJavaClass: string;
    private _actionType: JsHbPlaybackActionType;
    private _fieldName: string;
    private _simpleSettedValue: any;

    /**
     * Getter ownerSignatureStr
     * @return {string}
     */
	public get ownerSignatureStr(): string {
		return this._ownerSignatureStr;
	}

    /**
     * Getter ownerCreationId
     * @return {number}
     */
	public get ownerCreationId(): number {
		return this._ownerCreationId;
	}

    /**
     * Getter ownerCreationRefId
     * @return {number}
     */
	public get ownerCreationRefId(): number {
		return this._ownerCreationRefId;
	}

    /**
     * Getter settedSignatureStr
     * @return {string}
     */
	public get settedSignatureStr(): string {
		return this._settedSignatureStr;
	}

    /**
     * Getter settedCreationRefId
     * @return {number}
     */
	public get settedCreationRefId(): number {
		return this._settedCreationRefId;
	}

    /**
     * Getter ownerJavaClass
     * @return {string}
     */
	public get ownerJavaClass(): string {
		return this._ownerJavaClass;
	}

    /**
     * Getter actionType
     * @return {JsHbPlaybackActionType}
     */
	public get actionType(): JsHbPlaybackActionType {
		return this._actionType;
	}

    /**
     * Getter fieldName
     * @return {string}
     */
	public get fieldName(): string {
		return this._fieldName;
	}

    /**
     * Setter ownerSignatureStr
     * @param {string} value
     */
	public set ownerSignatureStr(value: string) {
		this._ownerSignatureStr = value;
	}

    /**
     * Setter ownerCreationId
     * @param {number} value
     */
	public set ownerCreationId(value: number) {
		this._ownerCreationId = value;
	}

    /**
     * Setter ownerCreationRefId
     * @param {number} value
     */
	public set ownerCreationRefId(value: number) {
		this._ownerCreationRefId = value;
	}

    /**
     * Setter settedSignatureStr
     * @param {string} value
     */
	public set settedSignatureStr(value: string) {
		this._settedSignatureStr = value;
	}

    /**
     * Setter settedCreationRefId
     * @param {number} value
     */
	public set settedCreationRefId(value: number) {
		this._settedCreationRefId = value;
	}

    /**
     * Setter ownerJavaClass
     * @param {string} value
     */
	public set ownerJavaClass(value: string) {
		this._ownerJavaClass = value;
	}

    /**
     * Setter actionType
     * @param {JsHbPlaybackActionType} value
     */
	public set actionType(value: JsHbPlaybackActionType) {
		this._actionType = value;
	}

    /**
     * Setter fieldName
     * @param {string} value
     */
	public set fieldName(value: string) {
		this._fieldName = value;
	}

    /**
     * Getter resolvedSettedValue
     * @return {any}
     */
	public get simpleSettedValue(): any {
		return this._simpleSettedValue;
	}

    /**
     * Setter resolvedSettedValue
     * @param {any} value
     */
	public set simpleSettedValue(value: any) {
		this._simpleSettedValue = value;
	}

}