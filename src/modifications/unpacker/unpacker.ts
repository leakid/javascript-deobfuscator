import Modification from '../../modification';
import * as Shift from 'shift-ast';
import { traverse } from '../../helpers/traverse';
import RArray from './array';
import RObject from './object';
import Scope from './scope';
import TraversalHelper from '../../helpers/traversalHelper';
import type { UnpackerConfig } from '../../config';

export default class Unpacker extends Modification {
    private readonly scopeTypes = new Set(['Block', 'FunctionBody']);
    private readonly config: UnpackerConfig;
    private readonly globalScope: Scope;
    private readonly arrayNodes: Set<Shift.Node>;
    private readonly objectNodes: Set<Shift.Node>;

    /**
     * Creates a new modification.
     * @param ast The AST.
     * @param config
     */
    constructor(ast: Shift.Script, config: UnpackerConfig) {
        super('Unpack Arrays', ast);
        this.config = config;
        this.globalScope = new Scope(this.ast);
        this.arrayNodes = new Set<Shift.Node>();
        this.objectNodes = new Set<Shift.Node>();
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        while (this.findVariableDeclarator()) {
            this.unpackObjectsArrays();
        }

        if (this.config.shouldRemove) {
            this.removeVariableDeclaration(this.globalScope);
        }
    }

    /**
     * Finds all literal arrays or objects and stores them in the according scope.
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
                } else if (
                    self.addLiteralArrayDeclaration(node, parent, scope) ||
                    self.addLiteralObjectDeclaration(node, parent, scope)
                ) {
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
     * Replaces all usages of literal arrays or objects.
     */
    private unpackObjectsArrays(): void {
        const self = this;
        let scope = this.globalScope;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.scopeTypes.has(node.type)) {
                    scope = scope.children.get(node) as Scope;
                } else {
                    self.replaceSimpleArrayAccess(node, parent, scope)
                    self.replaceSimpleObjectAccess(node, parent, scope)
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
     * Removes all the (suitable) arrays in a scope and its children.
     * @param scope The scope to remove arrays from.
     */
    private removeVariableDeclaration(scope: Scope): void {
        for (const [_, array] of scope.arrays) {
            if (array.replaceCount > 0) {
                TraversalHelper.removeNode(array.parentNode, array.node);
            }
        }
        for (const [_, object] of scope.objects) {
            if (object.replaceCount > 0) {
                TraversalHelper.removeNode(object.parentNode, object.node);
            }
        }

        for (const [_, child] of scope.children) {
            this.removeVariableDeclaration(child);
        }
    }

    /**
     * Returns whether a node is a literal array declaration.
     * @param node The AST node.
     * @param parent
     * @param scope
     */
    private addLiteralArrayDeclaration(node: Shift.Node, parent: Shift.Node, scope: Scope): boolean {
        if (
            this.config.unpackArrays &&
            node.type == 'VariableDeclarator' &&
            node.binding.type == 'BindingIdentifier' &&
            node.init != null &&
            node.init.type == 'ArrayExpression' &&
            node.init.elements.every(e => !e || e.type.startsWith('Literal')) &&
            !this.arrayNodes.has(node)
        ) {
            scope.addArray(new RArray(node, parent, node.binding.name, node.init.elements));
            this.arrayNodes.add(node);
            return true;
        }
        return false;
    }

    /**
     * Returns whether a node is a literal object declaration.
     * @param node The AST node.
     * @param parent
     * @param scope
     */
    private addLiteralObjectDeclaration(node: Shift.Node, parent: Shift.Node, scope: Scope): boolean {
        if (
            this.config.unpackObjects &&
            node.type == 'VariableDeclarator' &&
            node.binding.type == 'BindingIdentifier' &&
            node.init != null &&
            node.init.type == 'ObjectExpression' &&
            node.init.properties.every(e => e.type == 'DataProperty') &&
            !this.objectNodes.has(node)
        ) {
            scope.addObject(new RObject(node, parent, node.binding.name, node.init));
            this.objectNodes.add(node);
            return true;
        }
        return false;
    }

    private replaceSimpleArrayAccess(node: Shift.Node, parent: Shift.Node, scope: Scope) {
        if (
            node.type == 'ComputedMemberExpression' &&
            node.object.type == 'IdentifierExpression' &&
            node.expression.type == 'LiteralNumericExpression'
        ) {
            const array = scope.findArray(node.object.name);
            if (array) {
                const index = node.expression.value;
                const replacement = array.elements[index];

                if (replacement) {
                    array.replaceCount++;
                    TraversalHelper.replaceNode(parent, node, replacement);
                }
            }
        }
    }

    private replaceSimpleObjectAccess(node: Shift.Node, parent: Shift.Node, scope: Scope) {
        let index: string;
        if (
            node.type == 'ComputedMemberExpression' &&
            node.object.type == 'IdentifierExpression' &&
            node.expression.type == 'LiteralStringExpression'
        ) {
            index = node.expression.value;
        } else if (
            node.type == 'StaticMemberExpression' &&
            node.object.type == 'IdentifierExpression'
        ) {
            index = node.property;
        } else {
            return;
        }

        const object = scope.findObject(node.object.name);
        if (!object)
            return;

        const replacement = object.elements.properties.find(e =>
            e && e.type == 'DataProperty' && e.name.type == 'StaticPropertyName' && e.name.value == index
        ) as Shift.DataProperty | undefined;

        if (replacement?.expression?.type?.startsWith('Literal')) {
            object.replaceCount++;
            TraversalHelper.replaceNode(parent, node, replacement.expression);
        }
    }
}
