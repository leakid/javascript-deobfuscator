import parseScript from 'shift-parser';
import * as Shift from 'shift-ast';
import { codeGen, FormattedCodeGen } from 'shift-codegen';
import Modification from './modification';
import CacheRemover from './modifications/caches/cacheRemover';
import ProxyRemover from './modifications/proxies/proxyRemover';
import ExpressionSimplifier from './modifications/expressions/expressionSimplifier';
import ConstantUnpacker from './modifications/unpacker/constantUnpacker';
import PropertySimplifier from './modifications/properties/propertySimplifier';
import CleanupHelper from './helpers/cleanupHelper';
import Config from './config';
import VariableRenamer from './modifications/renaming/variableRenamer';
import FunctionExecutor from './modifications/execution/functionExecutor';
import DeadBranchRemover from './modifications/branches/deadBranchRemover';

const defaultConfig: Config = {
    verbose: !false,
    unpacker: {
        unpackArrays: true,
        unpackObjects: true,
        unpackValues: true,
        shouldRemove: true,
    },
    replaceCacheFunctions: true,
    proxyFunctions: {
        replaceProxyFunctions: true,
        removeProxyFunctions: true,
    },
    expressions: {
        simplifyExpressions: true,
        removeDeadBranches: true,
    },
    miscellaneous: {
        beautify: true,
        simplifyProperties: true,
        renameHexIdentifiers: false,
    },
};

/**
 * Deobfuscates a given source script.
 * @param source The source script.
 * @param config The deobfuscation configuration (optional).
 * @returns The deobfuscated script.
 */
export function deobfuscate(source: string, config: Config = defaultConfig): string {
    const ast = parseScript(source) as Shift.Script;
    const modifications: Modification[] = [];

    // function execution should always be checked for
    modifications.push(new FunctionExecutor(ast));

    if (config.replaceCacheFunctions) {
        modifications.push(new CacheRemover(ast));
    }

    if (config.proxyFunctions.replaceProxyFunctions) {
        modifications.push(new ProxyRemover(ast, config.proxyFunctions.removeProxyFunctions));
    }

    const to_unpacker = Object.entries(config.unpacker)
        .some(([key, value]) => key.startsWith('unpack') && value);

    let repeat = [config.expressions.simplifyExpressions, to_unpacker].filter(Boolean).length

    // simplify any expressions that were revealed by the array unpacking
    while (repeat --) {
        if (config.expressions.simplifyExpressions) {
            modifications.push(new ExpressionSimplifier(ast));
        }
        if (to_unpacker) {
            modifications.push(new ConstantUnpacker(ast, config.unpacker));
        }
    }

    if (config.expressions.removeDeadBranches) {
        modifications.push(new DeadBranchRemover(ast));
    }

    if (config.miscellaneous.simplifyProperties) {
        modifications.push(new PropertySimplifier(ast));
    }

    if (config.miscellaneous.renameHexIdentifiers) {
        modifications.push(new VariableRenamer(ast));
    }

    for (const modification of modifications) {
        if (config.verbose) {
            console.log(
                `[${new Date().toISOString()}]: Executing ${modification.constructor.name}`
            );
        }
        modification.execute();
    }

    CleanupHelper.cleanup(ast);
    const output = config.miscellaneous.beautify
        ? codeGen(ast, new FormattedCodeGen())
        : codeGen(ast);

    return output;
}
