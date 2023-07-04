import Modification from '../../modification';
import * as Shift from 'shift-ast';
import { traverse } from '../../helpers/traverse';
import TraversalHelper from '../../helpers/traversalHelper';
import Scope from './scope';
import CacheFunction from './cacheFunction';

export default class CacheRemover extends Modification {
    private readonly scopeTypes = new Set(['Block', 'FunctionBody']);
    private readonly assignmentTypes = new Set([
        'ExpressionStatement',
        'AssignmentTargetIdentifier',
    ]);
    private globalScope: Scope;
    private cacheFunctions: CacheFunction[];
    private cacheFunctionNames: Set<string>;

    /**
     * Creates a new modification.
     * @param ast The AST.
     */
    constructor(ast: Shift.Script) {
        super('Remove Cache Functions', ast);
        this.globalScope = new Scope(this.ast);
        this.cacheFunctions = [];
        this.cacheFunctionNames = new Set<string>();
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        this.findCacheFunctions();
        this.findAliases();
        this.replaceCacheFunctionUsages();
    }

    /**
     * Finds all cache functions and records them in the according scope.
     */
    private findCacheFunctions(): void {
        const self = this;
        let scope = this.globalScope;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.scopeTypes.has(node.type)) {
                    scope = new Scope(node, scope);
                }

                let name: string;
                let func_node: Shift.FunctionDeclaration | Shift.FunctionExpression;
                if (node.type == 'FunctionDeclaration') {
                    name = node.name.name;
                    func_node = node;

                } else if (self.isVariableAssignment(node, 'FunctionExpression')) {
                    name = (node as any).binding.name;
                    func_node = (node as any).init;
                } else {
                    return;
                }
                const assignment = self.findOverrideItself(name, func_node);
                const self_returns = self.getItselfReturnStatements(name, func_node);
                if (!assignment || !self_returns)
                    return;

                const cacheFunction = new CacheFunction(func_node, parent, scope, name, assignment, self_returns);

                scope.addCacheFunction(cacheFunction);
                self.cacheFunctions.push(cacheFunction);
                if (!self.cacheFunctionNames.has(cacheFunction.name)) {
                    self.cacheFunctionNames.add(cacheFunction.name);
                }
            },
            leave(node: Shift.Node) {
                if (node == scope.node && scope.parent) {
                    scope = scope.parent;
                }
            }
        });
    }

    /**
     * Finds aliases for cache functions.
     */
    private findAliases(): void {
        const self = this;
        let scope = this.globalScope;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.scopeTypes.has(node.type)) {
                    scope = scope.children.get(node) as Scope;
                }
                if (self.isVariableAssignment(node, 'IdentifierExpression')) {
                    const name = (node as any).init.name;
                    if (self.cacheFunctionNames.has(name)) {
                        const newName = (node as any).binding.name;

                        const cacheFunction = scope.findCacheFunction(name);
                        if (cacheFunction) {
                            scope.addAlias(cacheFunction, newName);
                            TraversalHelper.removeNode(parent, node);
                            if (!self.cacheFunctionNames.has(newName)) {
                                self.cacheFunctionNames.add(newName);
                            }
                        }
                    }
                }
            },
            leave(node: Shift.Node) {
                if (node == scope.node && scope.parent) {
                    scope = scope.parent;
                }
            }
        });
    }

    /**
     * Replaces all usages of cache functions in a given node.
     */
    private replaceCacheFunctionUsages() {
        for (const cacheFunction of this.cacheFunctions) {
            cacheFunction.makeReplacement();
        }
    }

    /**
     * Returns whether a Statement override function name.
     * @param name function name.
     * @param func_node: The AST node.
     * @returns Whether.
     */
    private findOverrideItself(name: string, func_node: Shift.FunctionDeclaration | Shift.FunctionExpression)
        : Shift.ExpressionStatement | undefined {
        let assignmentStatement;
        traverse(func_node, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (
                    node.type == 'AssignmentExpression' &&
                    node.expression.type == 'FunctionExpression' &&
                    func_node.params.items.length == node.expression.params.items.length &&
                    node.binding.type == 'AssignmentTargetIdentifier' &&
                    node.binding.name == name
                ) {
                    assignmentStatement = parent;
                }
            }
        });
        return assignmentStatement;
    }

    /**
     * Returns function return statements.
     * @param name function name.
     * @param func_node: The AST node.
     * @returns Whether.
     */
    private getItselfReturnStatements(name: string, func_node: Shift.FunctionDeclaration | Shift.FunctionExpression)
        : Shift.ReturnStatement[] {
        const return_statments = [] as Shift.ReturnStatement[];
        traverse(func_node.body, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (parent !== null && node.type == 'FunctionBody') {
                    return this.skip();
                }
                if (node.type != 'ReturnStatement')
                    return

                if (node.expression !== null &&
                    node.expression.type == 'CallExpression' &&
                    node.expression.callee.type == 'IdentifierExpression' &&
                    node.expression.callee.name == name &&
                    node.expression.arguments.every((item, i) =>
                        (item as any).name === (func_node.params.items[i] as any).name
                    )
                ) {
                    return_statments.push(node);
                } else {
                    return_statments.splice(0, return_statments.length);
                    this.break();
                }
            }
        });
        return return_statments;
    }

    /**
     * Returns whether a node is a variable assignment.
     * @param node The AST node.
     * @param type Init type.
     * @returns Whether.
     */
    private isVariableAssignment(node: Shift.Node, type: string): boolean {
        return (
            node.type == 'VariableDeclarator' &&
            node.binding.type == 'BindingIdentifier' &&
            node.init != null &&
            node.init.type == type
        );
    }
}
