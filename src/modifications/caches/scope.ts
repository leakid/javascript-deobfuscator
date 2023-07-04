import * as Shift from 'shift-ast';
import CacheFunction from './cacheFunction';

export default class Scope {
    node: Shift.Node;
    parent?: Scope;
    children: Map<Shift.Node, Scope>;
    cacheFunctions: Map<string, CacheFunction>;

    /**
     * Creates a new scope.
     * @param node The node that created the scope.
     * @param parent The parent scope (optional).
     */
    constructor(node: Shift.Node, parent?: Scope) {
        this.node = node;
        this.parent = parent;
        this.children = new Map<Shift.Node, Scope>();
        this.cacheFunctions = new Map<string, CacheFunction>();

        if (this.parent) {
            this.parent.children.set(this.node, this);
        }
    }

    /**
     * Searches for a cache function by name.
     * @param name The name of the cache function.
     */
    findCacheFunction(name: string): CacheFunction | null {
        if (this.cacheFunctions.has(name)) {
            return this.cacheFunctions.get(name) as CacheFunction;
        }

        return this.parent ? this.parent.findCacheFunction(name) : null;
    }

    /**
     * Adds a cache function.
     * @param cacheFunction The cache function to be added.
     */
    addCacheFunction(cacheFunction: CacheFunction): void {
        this.cacheFunctions.set(cacheFunction.name, cacheFunction);
    }

    /**
     * Adds an alias for a cache function.
     * @param func The cache function.
     * @param name The alias.
     */
    addAlias(func: CacheFunction, name: string): void {
        this.cacheFunctions.set(name, func);
    }
}
