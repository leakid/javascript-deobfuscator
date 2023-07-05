export default interface Config {
    verbose: boolean;
    replaceCacheFunctions: boolean;
    unpacker: UnpackerConfig;
    proxyFunctions: ProxyFunctionsConfig;
    expressions: ExpressionsConfig;
    miscellaneous: MiscellaneousConfig;
}

export interface UnpackerConfig {
    unpackArrays: boolean;
    unpackObjects: boolean;
    unpackValues: boolean;
    shouldRemove: boolean;
}

interface ProxyFunctionsConfig {
    replaceProxyFunctions: boolean;
    removeProxyFunctions: boolean;
}

interface ExpressionsConfig {
    simplifyExpressions: boolean;
    removeDeadBranches: boolean;
}

interface MiscellaneousConfig {
    beautify: boolean;
    simplifyProperties: boolean;
    renameHexIdentifiers: boolean;
}
