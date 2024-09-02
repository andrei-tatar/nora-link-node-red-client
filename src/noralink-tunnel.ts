import { of } from "rxjs";
import type { ConfigNode, NodeInterface } from "./types";

export default function (RED: any) {
    RED.nodes.registerType('noralink-tunnel', function (this: NodeInterface, config: any) {
        RED.nodes.createNode(this, config);

        const noralinkConfig: ConfigNode | null = RED.nodes.getNode(config.config);

        let url = config.url;

        const urlHasProtocol = /^https?:\/\//.test(url);
        if (!urlHasProtocol) {
            //if missing protocol, assume http
            url = `http://${url}`;
        }

        const subscription = (!noralinkConfig
            ? of('config missing')
            : noralinkConfig.registerTunnel({
                label: config.name,
                subdomain: config.subdomain,
                url,
            })
        ).subscribe(status => {
            this.status({
                fill: status === 'connected' ? 'blue' : (status === 'idle' ? 'yellow' : 'red'),
                text: status,
            });
        });

        this.on('close', () => subscription.unsubscribe());
    });
};