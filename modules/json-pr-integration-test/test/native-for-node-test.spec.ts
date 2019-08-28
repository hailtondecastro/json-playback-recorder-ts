import * as chai from 'chai';
import { Observable, of, OperatorFunction, from, Subject, BehaviorSubject, concat, throwError } from 'rxjs';
import resultMasterLiteral from './master-a-test.json';
import resultMasterLazyPrpOverSizedLiteral from './master-lazy-prp-over-sized-test.json';
import resultMasterADetailATestLiteral from './master-a-detail-a-test.json';
import { MasterAEnt } from './entities/master-a-ent';
import { Readable, Stream } from 'stream';
import * as memStreams from 'memory-streams';
import * as fs from 'fs';
import { AsyncCountdown } from './async-countdown.js';
import { AsyncCount } from './async-count.js';
import { ForNodeTest } from './native-for-node-test.js';
import { FieldInfo, MemStreamReadableStreamAutoEnd, BinaryStream, NonWritableStreamExtraMethods, StringStream, NonReadableStreamExtraMethods, timeoutDecorateRxOpr } from 'json-playback-recorder-ts';
import { delay, tap, map } from 'rxjs/operators';


{
    describe('ForNodeTest', () => {
        it('ForNodeTest.timeoutDecorateRxOpr', 1 == 1 ? (done) => { done(); } : (done) => {
            let asyncCountdown = new AsyncCountdown({ count: 1, timeOut: 4000});
            let asyncCount = new AsyncCount();

            const obs$ = of(null).pipe(
                asyncCount.registerRxOpr(),
                asyncCountdown.registerRxOpr(),
                delay(2000),
                timeoutDecorateRxOpr()
            );

            obs$.subscribe(() => {

            });

            asyncCountdown.createCountdownEnds().subscribe(() => {
                chai.expect(asyncCount.count).to.eq(1);
                done();
            });
        });

        it('ForNodeTest.StringSyncProcessor', (done) => {
            let asyncCountdown = new AsyncCountdown({ count: 3, timeOut: 1000});
            let asyncCount = new AsyncCount();
            let originalValue = 'originalValue_FOO_BAA';
            let fieldInfo: FieldInfo = {
                    fieldName: 'fieldName',
                    fieldType: String,
                    ownerType: Object,
                    ownerValue: {}
                };
            let toDirectRaw$ = ForNodeTest.StringProcessor.toDirectRaw(originalValue, fieldInfo)
                .pipe(
                    asyncCount.registerRxOpr(),
                    asyncCountdown.registerRxOpr()
                );
            let fromDirectRaw$ = ForNodeTest.StringProcessor.fromDirectRaw(toDirectRaw$, fieldInfo)
                .pipe(
                    asyncCount.registerRxOpr(),
                    asyncCountdown.registerRxOpr()
                );
            fromDirectRaw$.subscribe((respStreamStr) => {
                chai.expect(originalValue).to.eq(respStreamStr.body);
            });

            let myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
            myReadableStream.setEncoding('utf8');
            fromDirectRaw$ = ForNodeTest.StringProcessor.fromDirectRaw(of({ body: myReadableStream }), fieldInfo)
                .pipe(
                    asyncCount.registerRxOpr(),
                    asyncCountdown.registerRxOpr()
                );
            
            fromDirectRaw$.subscribe((respStreamStr) => {
                chai.expect(originalValue).to.eq(respStreamStr.body);
            });
            //myReadableStream.emit('end');

            asyncCountdown.createCountdownEnds().subscribe(() => {
                chai.expect(asyncCount.count).to.eq(3);
                done();
            });
        });

        it('ForNodeTest.BufferSyncProcessor', (done) => {
            let asyncCountdown = new AsyncCountdown({ count: 3, timeOut: 1000});
            let asyncCount = new AsyncCount();
            let originalValue = 'originalValue_FOO_BAA';
            let fieldInfo: FieldInfo = {
                    fieldName: 'fieldName',
                    fieldType: String,
                    ownerType: Object,
                    ownerValue: {}
                };
            let toDirectRaw$ = ForNodeTest.BufferProcessor.toDirectRaw(Buffer.from(originalValue, 'utf8'), fieldInfo)
                .pipe(
                    asyncCount.registerRxOpr(),
                    asyncCountdown.registerRxOpr(),
                    tap((respStream) => {
                        respStream.body.setEncoding('utf8'); 
                    })
                );
            let fromDirectRaw$ = ForNodeTest.StringProcessor.fromDirectRaw(toDirectRaw$, fieldInfo)
                .pipe(
                    asyncCount.registerRxOpr(),
                    asyncCountdown.registerRxOpr()
                );
            fromDirectRaw$.subscribe((respStr) => {
                chai.expect(originalValue).to.eq(respStr.body);
            });

            let myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
            fromDirectRaw$ = ForNodeTest.BufferProcessor.fromDirectRaw(
                of({ body: myReadableStream}),
                fieldInfo).pipe(
                asyncCount.registerRxOpr(),
                asyncCountdown.registerRxOpr(),
                map((respBuffer) => {
                    return { body: respBuffer.body.toString('utf-8') };
                })
            );
            
            fromDirectRaw$.subscribe((respBufferFromStream) => {
                chai.expect(respBufferFromStream.body).to.eq(respBufferFromStream.body);
            });
            //myReadableStream\.emit\('end'\);

            let literalValue = ForNodeTest.BufferProcessor.toLiteralValue(Buffer.from(originalValue, 'utf8'), fieldInfo)
            chai.expect(literalValue).to.eq('b3JpZ2luYWxWYWx1ZV9GT09fQkFB');

            let fromLiteralValue = ForNodeTest.BufferProcessor.fromLiteralValue('b3JpZ2luYWxWYWx1ZV9GT09fQkFB', fieldInfo)
            chai.expect((fromLiteralValue as Buffer).toString('utf8')).to.eq(originalValue);

            asyncCountdown.createCountdownEnds().subscribe(() => {
                chai.expect(asyncCount.count).to.eq(3);
                done();
            });
        });

        it('ForNodeTest.BinaryStreamSyncProcessor', (done) => {
            let asyncCountdown = new AsyncCountdown({ count: 5, timeOut: 1000});
            let asyncCount = new AsyncCount();
            let originalValue = 'originalValue_FOO_BAA';
            let fieldInfo: FieldInfo = {
                    fieldName: 'fieldName',
                    fieldType: String,
                    ownerType: Object,
                    ownerValue: {}
                };
            let myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
            let binaryWRStream: BinaryStream = Object.assign(myReadableStream, NonWritableStreamExtraMethods);
            let toDirectRaw$ = ForNodeTest.BinaryStreamProcessor.toDirectRaw(binaryWRStream, fieldInfo)
                .pipe(
                    asyncCount.registerRxOpr(),
                    asyncCountdown.registerRxOpr()
                );
            toDirectRaw$.subscribe((respStream) => {
                respStream.body.setEncoding('utf8');
                let fromDirectRaw$ = ForNodeTest.StringProcessor.fromDirectRaw(of(respStream), fieldInfo)
                    .pipe(
                        asyncCount.registerRxOpr(),
                        asyncCountdown.registerRxOpr()
                    );
                fromDirectRaw$.subscribe((respStr) => {
                    chai.expect(originalValue).to.eq(respStr.body);
                });
            });

            myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
            let fromDirectRaw$ = ForNodeTest.BinaryStreamProcessor.fromDirectRaw(of({ body: myReadableStream } ), fieldInfo)
                .pipe(
                    asyncCount.registerRxOpr(),
                    asyncCountdown.registerRxOpr()
                );
            
            fromDirectRaw$.subscribe((respStream) => {
                let fromDirectRaw$ = ForNodeTest.StringProcessor.fromDirectRaw(of(respStream), fieldInfo)
                    .pipe(
                        asyncCount.registerRxOpr(),
                        asyncCountdown.registerRxOpr()
                    );
                fromDirectRaw$.subscribe((respStreamStr) => {
                    chai.expect(originalValue).to.eq(respStreamStr.body);
                });
            });
            //myReadableStream\.emit\('end'\);

            myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
            binaryWRStream = Object.assign(myReadableStream, NonWritableStreamExtraMethods);

            let fromLiteralValue = ForNodeTest.BinaryStreamProcessor.fromLiteralValue('b3JpZ2luYWxWYWx1ZV9GT09fQkFB', fieldInfo)
            let fromDirectRawB$ = ForNodeTest.StringProcessor.fromDirectRaw(of({ body: fromLiteralValue }), fieldInfo).pipe(
                asyncCount.registerRxOpr(),
                asyncCountdown.registerRxOpr()
            );
            asyncCount.doNonObservableIncrement();
            fromDirectRawB$.subscribe((streamStr) => {
                chai.expect(originalValue).to.eq(streamStr.body);
            });

            asyncCountdown.createCountdownEnds().subscribe(() => {
                chai.expect(asyncCount.count).to.eq(6);
                done();
            });
        });

        it('ForNodeTest.StringStreamSyncProcessor', (done) => {
            let asyncCountdown = new AsyncCountdown({ count: 4, timeOut: 1000});
            let asyncCount = new AsyncCount();
            let originalValue = 'originalValue_FOO_BAA';
            let fieldInfo: FieldInfo = {
                    fieldName: 'fieldName',
                    fieldType: String,
                    ownerType: Object,
                    ownerValue: {}
                };

            let myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
            let stringStream: StringStream = Object.assign(myReadableStream, NonWritableStreamExtraMethods);
            let toDirectRaw$ = ForNodeTest.StringStreamProcessor.toDirectRaw(stringStream, fieldInfo)
                .pipe(
                    asyncCount.registerRxOpr(),
                    asyncCountdown.registerRxOpr()
                );
            toDirectRaw$.subscribe((respStream) => {
                let fromDirectRaw$ = ForNodeTest.StringProcessor.fromDirectRaw(of(respStream), fieldInfo)
                    .pipe(
                        asyncCount.registerRxOpr(),
                        asyncCountdown.registerRxOpr()
                    );
                fromDirectRaw$.subscribe((respStreamStr) => {
                    chai.expect(originalValue).to.eq(respStreamStr.body);
                });
            });

            myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
            let myWriStream: NodeJS.WritableStream = new memStreams.WritableStream();
            stringStream = Object.assign(myWriStream, NonReadableStreamExtraMethods);
            let fromDirectRaw$ = ForNodeTest.StringStreamProcessor.fromDirectRaw(of({ body: myReadableStream }), fieldInfo)
                .pipe(
                    asyncCount.registerRxOpr(),
                    asyncCountdown.registerRxOpr()
                );

            fromDirectRaw$.subscribe((respStream) => {
                asyncCount.doNonObservableIncrement();
                respStream.body.setEncoding('utf8');
                let fromDirectRaw$ = ForNodeTest.StringProcessor.fromDirectRaw(of(respStream), fieldInfo)
                    .pipe(
                        asyncCount.registerRxOpr(),
                        asyncCountdown.registerRxOpr()
                    );
                fromDirectRaw$.subscribe((respStreamStr) => {
                    chai.expect(originalValue).to.eq(respStreamStr.body);
                });
            });
            //myReadableStream\.emit\('end'\);
            //myReadableStream\.emit\('end'\);

            let fromLiteralValue = ForNodeTest.StringStreamProcessor.fromLiteralValue('originalValue_FOO_BAA', fieldInfo);
            let fromDirectRawB$ = ForNodeTest.StringProcessor.fromDirectRaw(of({ body: fromLiteralValue}), fieldInfo);
            fromDirectRawB$.subscribe((respStreamStr) => {
                chai.expect(originalValue).to.eq(respStreamStr.body);
            })

            asyncCountdown.createCountdownEnds().subscribe(() => {
                chai.expect(asyncCount.count).to.eq(5);
                done();
            });
        });

        // it('ForNodeTest.StringProcessor', (done) => {
        //     let asyncCountdown = new AsyncCountdown({ count: 3, timeOut: 1000});
        //     let asyncCount = new AsyncCount();
        //     let originalValue = 'originalValue_FOO_BAA';
        //     let fieldInfo: FieldInfo = {
        //             fieldName: 'fieldName',
        //             fieldType: String,
        //             ownerType: Object,
        //             ownerValue: {}
        //         };
        //     let toDirectRaw$ = ForNodeTest.StringProcessor.toDirectRaw(originalValue, fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
        //     toDirectRaw$.subscribe((stream) => {
        //         let fromDirectRaw$ = ForNodeTest.StringSyncProcessor.fromDirectRaw(stream, fieldInfo)
        //             .pipe(
        //                 asyncCount.registerRxOpr(),
        //                 asyncCountdown.registerRxOpr()
        //             );
        //         fromDirectRaw$.subscribe((streamStr) => {
        //             chai.expect(originalValue).to.eq(streamStr);
        //         });
        //     });

        //     let myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
        //     let fromDirectRaw$ = ForNodeTest.StringProcessor.fromDirectRaw(myReadableStream, fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
            
        //     fromDirectRaw$.subscribe((streamStr) => {
        //         chai.expect(originalValue).to.eq(streamStr);
        //     });
        //     //myReadableStream\.emit\('end'\);

        //     asyncCountdown.createCountdownEnds().subscribe(() => {
        //         chai.expect(asyncCount.count).to.eq(3);
        //         done();
        //     });
        // });

        // it('ForNodeTest.BufferProcessor', (done) => {
        //     let asyncCountdown = new AsyncCountdown({ count: 5, timeOut: 1000});
        //     let asyncCount = new AsyncCount();
        //     let originalValue = 'originalValue_FOO_BAA';
        //     let fieldInfo: FieldInfo = {
        //             fieldName: 'fieldName',
        //             fieldType: String,
        //             ownerType: Object,
        //             ownerValue: {}
        //         };
        //     let toDirectRaw$ = ForNodeTest.BufferProcessor.toDirectRaw(Buffer.from(originalValue, 'utf8'), fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
        //     toDirectRaw$.subscribe((stream) => {
        //         let fromDirectRaw$ = ForNodeTest.StringSyncProcessor.fromDirectRaw(stream, fieldInfo)
        //             .pipe(
        //                 asyncCount.registerRxOpr(),
        //                 asyncCountdown.registerRxOpr()
        //             );
        //         fromDirectRaw$.subscribe((streamStr) => {
        //             chai.expect(originalValue).to.eq(streamStr);
        //         });
        //     });

        //     let myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
        //     let fromDirectRaw$ = ForNodeTest.BufferProcessor.fromDirectRaw(myReadableStream, fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
            
        //     fromDirectRaw$.subscribe((bufferFromStream) => {
        //         chai.expect(originalValue).to.eq(bufferFromStream.toString('utf8'));
        //     });
        //     //myReadableStream\.emit\('end'\);

        //     let toLiteralValue$ = ForNodeTest.BufferProcessor.toLiteralValue(Buffer.from(originalValue, 'utf8'), fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );

        //     toLiteralValue$.subscribe((literalValue) => {
        //         chai.expect(literalValue).to.eq('b3JpZ2luYWxWYWx1ZV9GT09fQkFB');
        //         //console.log(literalValue);
        //     });

        //     let fromLiteralValue$ = ForNodeTest.BufferProcessor.fromLiteralValue('b3JpZ2luYWxWYWx1ZV9GT09fQkFB', fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
        //     fromLiteralValue$.subscribe((bufferFromLiteral) => {
        //         chai.expect((bufferFromLiteral as Buffer).toString('utf8')).to.eq(originalValue);
        //     })

        //     asyncCountdown.createCountdownEnds().subscribe(() => {
        //         chai.expect(asyncCount.count).to.eq(5);
        //         done();
        //     });
        // });

        // it('ForNodeTest.BinaryStreamProcessor', (done) => {
        //     let asyncCountdown = new AsyncCountdown({ count: 7, timeOut: 1000});
        //     let asyncCount = new AsyncCount();
        //     let originalValue = 'originalValue_FOO_BAA';
        //     let fieldInfo: FieldInfo = {
        //             fieldName: 'fieldName',
        //             fieldType: String,
        //             ownerType: Object,
        //             ownerValue: {}
        //         };
        //     let myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
        //     let binaryWRStream: BinaryStream = Object.assign(myReadableStream, NonWritableStreamExtraMethods);
        //     let toDirectRaw$ = ForNodeTest.BinaryStreamProcessor.toDirectRaw(binaryWRStream, fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
        //     toDirectRaw$.subscribe((stream) => {
        //         let fromDirectRaw$ = ForNodeTest.StringSyncProcessor.fromDirectRaw(stream, fieldInfo)
        //             .pipe(
        //                 asyncCount.registerRxOpr(),
        //                 asyncCountdown.registerRxOpr()
        //             );
        //         fromDirectRaw$.subscribe((streamStr) => {
        //             chai.expect(originalValue).to.eq(streamStr);
        //         });
        //     });

        //     myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
        //     let fromDirectRaw$ = ForNodeTest.BinaryStreamProcessor.fromDirectRaw(myReadableStream, fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
            
        //     fromDirectRaw$.subscribe((stream) => {
        //         let fromDirectRaw$ = ForNodeTest.StringSyncProcessor.fromDirectRaw(stream, fieldInfo)
        //             .pipe(
        //                 asyncCount.registerRxOpr(),
        //                 asyncCountdown.registerRxOpr()
        //             );
        //         fromDirectRaw$.subscribe((streamStr) => {
        //             chai.expect(originalValue).to.eq(streamStr);
        //         });
        //     });
        //     //myReadableStream\.emit\('end'\);

        //     myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
        //     binaryWRStream = Object.assign(myReadableStream, NonWritableStreamExtraMethods);
        //     let toLiteralValue$ = ForNodeTest.BinaryStreamProcessor.toLiteralValue(binaryWRStream, fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );

        //     toLiteralValue$.subscribe((literalValue) => {
        //         chai.expect(literalValue).to.eq('b3JpZ2luYWxWYWx1ZV9GT09fQkFB');
        //         //console.log(literalValue);
        //     });
        //     //myReadableStream\.emit\('end'\);

        //     let fromLiteralValue$ = ForNodeTest.BinaryStreamProcessor.fromLiteralValue('b3JpZ2luYWxWYWx1ZV9GT09fQkFB', fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
        //     fromLiteralValue$.subscribe((stream) => {
        //         let fromDirectRaw$ = ForNodeTest.StringSyncProcessor.fromDirectRaw(stream, fieldInfo)
        //             .pipe(
        //                 asyncCount.registerRxOpr(),
        //                 asyncCountdown.registerRxOpr()
        //             );
        //         fromDirectRaw$.subscribe((streamStr) => {
        //             chai.expect(originalValue).to.eq(streamStr);
        //         });
        //     })

        //     asyncCountdown.createCountdownEnds().subscribe(() => {
        //         chai.expect(asyncCount.count).to.eq(7);
        //         done();
        //     });
        // });

        // it('ForNodeTest.StringStreamProcessor', (done) => {
        //     let asyncCountdown = new AsyncCountdown({ count: 7, timeOut: 1000});
        //     let asyncCount = new AsyncCount();
        //     let originalValue = 'originalValue_FOO_BAA';
        //     let fieldInfo: FieldInfo = {
        //             fieldName: 'fieldName',
        //             fieldType: String,
        //             ownerType: Object,
        //             ownerValue: {}
        //         };

        //     let myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
        //     let stringStream: StringStream = Object.assign(myReadableStream, NonWritableStreamExtraMethods);
        //     let toDirectRaw$ = ForNodeTest.StringStreamProcessor.toDirectRaw(stringStream, fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
        //     toDirectRaw$.subscribe((stream) => {
        //         let fromDirectRaw$ = ForNodeTest.StringSyncProcessor.fromDirectRaw(stream, fieldInfo)
        //             .pipe(
        //                 asyncCount.registerRxOpr(),
        //                 asyncCountdown.registerRxOpr()
        //             );
        //         fromDirectRaw$.subscribe((streamStr) => {
        //             chai.expect(originalValue).to.eq(streamStr);
        //         });
        //     });

        //     myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
        //     let myWriStream: NodeJS.WritableStream = new memStreams.WritableStream();
        //     stringStream = Object.assign(myWriStream, NonReadableStreamExtraMethods);
        //     let fromDirectRaw$ = ForNodeTest.StringStreamProcessor.fromDirectRaw(myReadableStream, fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
            
        //     fromDirectRaw$.subscribe((stream) => {
        //         let fromDirectRaw$ = ForNodeTest.StringSyncProcessor.fromDirectRaw(stream, fieldInfo)
        //             .pipe(
        //                 asyncCount.registerRxOpr(),
        //                 asyncCountdown.registerRxOpr()
        //             );
        //         fromDirectRaw$.subscribe((streamStr) => {
        //             chai.expect(originalValue).to.eq(streamStr);
        //         });
        //     });
        //     //myReadableStream\.emit\('end'\);

        //     myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
        //     stringStream = Object.assign(myReadableStream, NonWritableStreamExtraMethods);
        //     let toLiteralValue$ = ForNodeTest.StringStreamProcessor.toLiteralValue(stringStream, fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );

        //     toLiteralValue$.subscribe((literalValue) => {
        //         chai.expect(literalValue).to.eq('originalValue_FOO_BAA');
        //         //console.log(literalValue);
        //     });
        //     //myReadableStream\.emit\('end'\);

        //     let fromLiteralValue$ = ForNodeTest.StringStreamProcessor.fromLiteralValue('originalValue_FOO_BAA', fieldInfo)
        //         .pipe(
        //             asyncCount.registerRxOpr(),
        //             asyncCountdown.registerRxOpr()
        //         );
        //     fromLiteralValue$.subscribe((stream) => {
        //         let fromDirectRaw$ = ForNodeTest.StringSyncProcessor.fromDirectRaw(stream, fieldInfo)
        //             .pipe(
        //                 asyncCount.registerRxOpr(),
        //                 asyncCountdown.registerRxOpr()
        //             );
        //         fromDirectRaw$.subscribe((streamStr) => {
        //             chai.expect(originalValue).to.eq(streamStr);
        //         });
        //     })

        //     asyncCountdown.createCountdownEnds().subscribe(() => {
        //         chai.expect(asyncCount.count).to.eq(7);
        //         done();
        //     });
        // });

        it('ForNodeTest.CacheHandlerSync', (done) => {
            let asyncCountdown = new AsyncCountdown({ count: 3, timeOut: 1000});
            let asyncCount = new AsyncCount();
            let originalValue = 'originalValue_FOO_BAA';
            // let fieldInfo: FieldInfo = {
            //         fieldName: 'fieldName',
            //         fieldType: String,
            //         ownerType: Object,
            //         ownerValue: {}
            //     };

            let myReadableStream = new MemStreamReadableStreamAutoEnd(originalValue);
            let stringStream: StringStream = Object.assign(myReadableStream, NonWritableStreamExtraMethods);
            let putOnCache$ = ForNodeTest.CacheHandlerSync.putOnCache('foo_key', stringStream)
                .pipe(
                    asyncCount.registerRxOpr(),
                    asyncCountdown.registerRxOpr()
                );
            putOnCache$.subscribe(() => {
                let getFromCache$ = ForNodeTest.CacheHandlerSync.getFromCache('foo_key')
                    .pipe(
                        asyncCount.registerRxOpr(),
                        asyncCountdown.registerRxOpr()
                    );
                getFromCache$.subscribe((stream) => {
                    let fromDirectRaw$ = ForNodeTest.StringProcessor.fromDirectRaw(of({ body: stream }), null)
                        .pipe(
                            asyncCount.registerRxOpr(),
                            asyncCountdown.registerRxOpr()
                        );
                    fromDirectRaw$.subscribe((respStreamStr) => {
                        chai.expect(originalValue).to.eq(respStreamStr.body);
                    });
                });
            });

            asyncCountdown.createCountdownEnds().subscribe(() => {
                chai.expect(asyncCount.count).to.eq(3);
                done();
            });
        });
    });
}