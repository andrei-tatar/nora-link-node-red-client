import { BehaviorSubject, debounceTime, distinctUntilChanged, EMPTY, merge, Observable, ReplaySubject, share, Subject, switchMap, takeUntil } from "rxjs";
import { ConfigNode, NodeInterface } from "./types";
import { Client, TunnelOptions } from "@nora-link/client/dist/client";

export default function (RED: any) {
    RED.nodes.registerType('noralink-config', function (this: NodeInterface & ConfigNode, config: any) {
        RED.nodes.createNode(this, config);

        const tunnels$ = new BehaviorSubject<TunnelOptions[]>([])
        const close$ = new Subject<any>();
        const apikey = this.credentials && this.credentials.apikey;

        const status$ = tunnels$.pipe(
            debounceTime(500),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
            switchMap(tunnels => {
                if (!tunnels || !apikey) {
                    return EMPTY;
                }
                const client = new Client({
                    apiKey: apikey,
                    tunnels,
                    logger: RED.log,
                });
                return client.handle$;
            }),
        ).pipe(
            share({
                connector: () => new ReplaySubject(1),
            }),
            takeUntil(close$),
        );

        this.registerTunnel = (options: TunnelOptions) => {
            return merge(
                new Observable<never>(_ => {
                    tunnels$.next([...tunnels$.value, options]);
                    return () => tunnels$.next(tunnels$.value.filter(v => v !== options));
                }),
                status$,
            ).pipe(
                takeUntil(close$),
            );
        };

        status$.subscribe();

        this.on('close', () => close$.next(1));
    }, {
        credentials: {
            apikey: { type: 'password' },
        },
    });
};