import { TapeActionType, TapeAction } from '../api/tape';

export class TapeActionDefault {
    private _ownerSignatureStr: string;
    private _ownerCreationId: number;
    private _ownerCreationRefId: number;
    private _settedSignatureStr: string;
    private _settedCreationRefId: number;
    private _ownerPlayerType: string;
    private _actionType: TapeActionType;
    private _fieldName: string;
    private _simpleSettedValue: any;
    private _attachRefId: string;


    /**
     * Getter attachRefId
     * @return {number}
     */
	public get attachRefId(): string {
		return this._attachRefId;
	}

    /**
     * Setter attachRefId
     * @param {string} value
     */
	public set attachRefId(value: string) {
		this._attachRefId = value;
	}


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
     * Getter ownerPlayerType
     * @return {string}
     */
	public get ownerPlayerType(): string {
		return this._ownerPlayerType;
	}

    /**
     * Getter actionType
     * @return {TapeActionType}
     */
	public get actionType(): TapeActionType {
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
     * Setter ownerPlayerType
     * @param {string} value
     */
	public set ownerPlayerType(value: string) {
		this._ownerPlayerType = value;
	}

    /**
     * Setter actionType
     * @param {TapeActionType} value
     */
	public set actionType(value: TapeActionType) {
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

export class TapeDefault {
    private _actions: Array<TapeAction> = new Array<TapeAction>();

    /**
     * Getter actions
     * @return {Array<TapeAction> }
     */
	public get actions(): Array<TapeAction>  {
		return this._actions;
	}

    /**
     * Setter actions
     * @param {Array<TapeAction> } value
     */
	public set actions(value: Array<TapeAction> ) {
		this._actions = value;
	}

}