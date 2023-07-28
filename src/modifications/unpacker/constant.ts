import * as Shift from 'shift-ast';
import Scope from './scope';
import TraversalHelper from '../../helpers/traversalHelper';

export const NODES_MAP = {} as Record<string, Set<Shift.Node>>

export default class Constant<T> {
    readonly ID: string = '';
    node: Shift.Node;
    parentNode: Shift.Node;
    name: string;
    elements: T;
    overrideCount: number;
    replaceCount: number;

    /**
     * Creates a new array.
     * @param node The declaration node.
     * @param parentNode The parent node.
     * @param name The name of the array.
     * @param elements The elements in the array.
     */
    constructor(
        node: Shift.Node,
        parentNode: Shift.Node,
        name: string,
        elements: T
    ) {
        this.name = name;
        this.elements = elements;
        this.node = node;
        this.parentNode = parentNode;
        this.overrideCount = 0;
        this.replaceCount = 0;
    }

    get nodesSet() {
        if (!NODES_MAP[this.ID])
            NODES_MAP[this.ID] = new Set();
        return NODES_MAP[this.ID]
    }

    getVariableDeclarator(node: Shift.Node): {
        name: string,
        expretion?: Shift.Expression
    } {
        if (
            node.type == 'VariableDeclarator' &&
            node.binding.type == 'BindingIdentifier' &&
            node.init != null &&
            !this.nodesSet.has(node)
        ) {
            return { name: node.binding.name, expretion: node.init };
        }
        return { name: '' };
    }
    addDeclarationToScope(node: Shift.Node, parent: Shift.Node, scope: Scope): boolean {
        return false;
    }

    getReplacement(metadata: any): Shift.Expression | undefined {
        return;
    }
    replaceSimpleAccess(node: Shift.Node, parent: Shift.Node, scope: Scope, name?: string, metadata?: any) {
        // /!\ must call super.replaceSimpleAccess if IdentifierExpression match
        // to increment the overrideCount
        const constant = scope.findVariable(name ?? '') as Constant<T>;
        if (!constant)
            return;

        const replacement = constant.getReplacement(metadata);
        if (replacement) {
            TraversalHelper.replaceNode(parent, node, replacement);
        } else {
            constant.overrideCount++;
        }
    }
}
