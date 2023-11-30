import { RspackPluginInstance, Compiler } from '@rspack/core';

interface Options {
    layerHyphen?: string;
}
declare class UnocssRspackPlugin implements RspackPluginInstance {
    options: Options;
    LOADER_PATH: string;
    constructor(options: Options);
    get RE(): RegExp;
    ensureLoader(): void;
    isUnocssId(id: string): boolean;
    resolveLayer(id: string): string | undefined;
    apply(compiler: Compiler): void;
}

export { UnocssRspackPlugin as default };
