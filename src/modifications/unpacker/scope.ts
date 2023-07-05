import * as Shift from 'shift-ast';
import Constant from './constant';
import TraversalHelper from '../../helpers/traversalHelper';

export default class Scope {
    node: Shift.Node;
    parent?: Scope;
    children: Map<Shift.Node, Scope>;
    mapping: Map<string, Constant<any>>;

    /**
     * Creates a new scope.
     * @param node The node that created the scope.
     * @param parent The parent scope (optional).
     */
    constructor(node: Shift.Node, parent?: Scope) {
        this.node = node;
        this.parent = parent;
        this.children = new Map<Shift.Node, Scope>();
        this.mapping = new Map<string, Constant<any>>();

        if (this.parent) {
            this.parent.children.set(this.node, this);
        }
    }

    /**
     * Adds a constant.
     * @param constant The constant to be added.
     */
    addVariable(constant: Constant<any>): void {
        this.addAlias(constant, constant.name);
    }

    /**
     * Searches for an variable by name.
     * @param name The name of the array.
     */
    findVariable<T>(name: string): Constant<T> | null {
        if (this.mapping.has(name)) {
            return this.mapping.get(name) as Constant<T>;
        }

        return this.parent ? this.parent.findVariable(name) : null;
    }

    /**
     * Adds an alias for a constant.
     * @param constant The constant to be added.
     * @param name The alias.
     */
    addAlias(constant: Constant<any>, name: string): void {
        if (this.mapping.has(constant.name)) {
            throw new Error(`this ${constant.ID} are alredy mapped ${constant.name}`)
        }
        this.mapping.set(name, constant);
    }

    /**
     * Removes all the (suitable) constant in this scope and its children.
     */
    removeVariableDeclaration(): void {
        for (const [_, constant] of this.mapping) {
            if (constant.overrideCount == 0) {
                TraversalHelper.removeNode(constant.parentNode, constant.node);
            }
        }

        for (const [_, child] of this.children) {
            child.removeVariableDeclaration();
        }
    }
}
