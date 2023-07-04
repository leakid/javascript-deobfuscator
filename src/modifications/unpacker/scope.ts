import * as Shift from 'shift-ast';
import RArray from './array';
import RObject from './object';

export default class Scope {
    node: Shift.Node;
    parent?: Scope;
    children: Map<Shift.Node, Scope>;
    objects: Map<string, RObject>;
    arrays: Map<string, RArray>;

    /**
     * Creates a new scope.
     * @param node The node that created the scope.
     * @param parent The parent scope (optional).
     */
    constructor(node: Shift.Node, parent?: Scope) {
        this.node = node;
        this.parent = parent;
        this.children = new Map<Shift.Node, Scope>();
        this.objects = new Map<string, RObject>();
        this.arrays = new Map<string, RArray>();

        if (this.parent) {
            this.parent.children.set(this.node, this);
        }
    }

    /**
     * Searches for an array by name.
     * @param name The name of the array.
     */
    findArray(name: string): RArray | null {
        if (this.arrays.has(name)) {
            return this.arrays.get(name) as RArray;
        }

        return this.parent ? this.parent.findArray(name) : null;
    }

    /**
     * Searches for an object by name.
     * @param name The name of the object.
     */
    findObject(name: string): RObject | null {
        // console.log(this.objects)
        if (this.objects.has(name)) {
            return this.objects.get(name) as RObject;
        }

        return this.parent ? this.parent.findObject(name) : null;
    }

    /**
     * Adds an array.
     * @param array The array to be added.
     */
    addArray(array: RArray): void {
        this.arrays.set(array.name, array);
    }

    /**
     * Adds an ObjectArray.
     * @param object The object to be added.
     */
    addObject(object: RObject): void {
        this.objects.set(object.name, object);
    }
}
