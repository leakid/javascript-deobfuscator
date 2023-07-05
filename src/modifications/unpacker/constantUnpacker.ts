import Modification from '../../modification';
import * as Shift from 'shift-ast';
import { traverse } from '../../helpers/traverse';
import RArray from './array';
import RObject from './object';
import Scope from './scope';
import type { UnpackerConfig } from '../../config';
import Constant from './constant';
import RValue from './value';

export default class ConstantUnpacker extends Modification {
    private readonly scopeTypes = new Set(['Block', 'FunctionBody']);
    private readonly config: UnpackerConfig;
    private readonly globalScope: Scope;
    private readonly constants: Constant<any>[];

    /**
     * Creates a new modification.
     * @param ast The AST.
     * @param config
     */
    constructor(ast: Shift.Script, config: UnpackerConfig) {
        super('Unpack Arrays', ast);
        this.config = config;
        this.globalScope = new Scope(this.ast);
        this.constants = [];
        if (config.unpackArrays)
            this.constants.push(RArray.prototype)
        if (config.unpackObjects)
            this.constants.push(RObject.prototype)
        if (config.unpackValues)
            this.constants.push(RValue.prototype)
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        while (this.findVariableDeclarator()) {
            this.unpackConstants();
        }

        if (this.config.shouldRemove) {
            this.globalScope.removeVariableDeclaration();
        }
    }

    /**
     * Finds all literal constant and stores them in the according scope.
     * @returns Whether any new literal arrays or objects were found.
     */
    private findVariableDeclarator(): boolean {
        const self = this;
        let scope = this.globalScope;
        let foundVariableDeclarator = false;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.scopeTypes.has(node.type)) {
                    scope = new Scope(node, scope);
                } else if (self.constants.some(constant_cls =>
                    constant_cls.addDeclarationToScope(node, parent, scope)
                )) {
                    foundVariableDeclarator = true;
                }
            },
            leave(node: Shift.Node) {
                if (node == scope.node && scope.parent) {
                    scope = scope.parent;
                }
            }
        });

        return foundVariableDeclarator;
    }

    /**
     * Replaces all usages of literal constant.
     */
    private unpackConstants(): void {
        const self = this;
        let scope = this.globalScope;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.scopeTypes.has(node.type)) {
                    scope = scope.children.get(node) as Scope;
                } else {
                    self.constants.some(constant_cls =>
                        constant_cls.replaceSimpleAccess(node, parent, scope)
                    )
                }
            },
            leave(node: Shift.Node) {
                if (node == scope.node && scope.parent) {
                    scope = scope.parent;
                }
            }
        });
    }
}
