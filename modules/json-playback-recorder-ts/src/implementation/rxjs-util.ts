import { OperatorFunction, ObservableInput, Observable, of } from "rxjs";
import { map, flatMap } from "rxjs/operators";

export function combineFirstSerial<T>(array: Observable<T>[]): Observable<T[]> {
    const resutlArr: T[] = new Array<T>(array.length);
    const resutltObsArrRef = { value: null as Observable<any> };

    for (let index = 0; index < array.length; index++) {
        const element$ = array[index];
        if (!resutltObsArrRef.value) {
            resutltObsArrRef.value = element$.pipe(
                flatMapJustOnceRxOpr((resultT) => {
                    resutlArr[index] = resultT;
                    return element$;
                })
            );
        } else {
            resutltObsArrRef.value = resutltObsArrRef.value.pipe(
                flatMapJustOnceRxOpr((resultT) => {
                    resutlArr[index] = resultT;
                    return element$;
                })
            );
        }
    }
    if (!resutltObsArrRef.value) {
        resutltObsArrRef.value = of(null) as Observable<T>;
    }
    return resutltObsArrRef.value.pipe(
        mapJustOnceRxOpr((resultT) => {
            return resutlArr;
        })
    );
}

export function mapJustOnceRxOpr<T, R>(project: (value: T, index?: number) => R, thisArg?: any): OperatorFunction<T, R> {
    const isPipedCallbackDone = { value: false, result: null as R};
    let rxOpr: OperatorFunction<T, R> = (source) => {
        let projectExtentend = (value: T, index: number) => {
            if (!isPipedCallbackDone.value) {
                isPipedCallbackDone.value = true;
                isPipedCallbackDone.result = project(value, index);
            }
            return isPipedCallbackDone.result;
        }
        return source
            .pipe(
                map(projectExtentend)
            );
    }
    return rxOpr;
}

export function flatMapJustOnceRxOpr<T, R>(project: (value: T, index?: number) => ObservableInput<R>, concurrent?: number): OperatorFunction<T, R> {
    const isPipedCallbackDone = { value: false, result: null as ObservableInput<R>};
    let rxOpr: OperatorFunction<T, R> = (source) => {
        let projectExtentend = (value: T, index: number) => {
            if (!isPipedCallbackDone.value) {
                isPipedCallbackDone.value = true;
                isPipedCallbackDone.result = project(value, index);
            }
            return isPipedCallbackDone.result;
        }
        return source
            .pipe(
                flatMap(projectExtentend)
            );
    }
    return rxOpr;
}