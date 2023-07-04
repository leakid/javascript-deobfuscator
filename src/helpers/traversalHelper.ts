import { traverse } from './traverse';
import * as Shift from 'shift-ast';

export default class TraversalHelper {
    /**
     * Replaces a node within a given section of the AST.
     * @param root The root node.
     * @param target The node to replace.
     * @param replacement The replacement node, nodes or null.
     * @param delete_count
     * @param after
     */
    static replaceNode(
        root: Shift.Node,
        target: Shift.Node,
        replacement: Shift.Node | Shift.Node[] | null,
        delete_count = 1,
        after = false,
    ): void {
        traverse(root, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (node != target)
                    return;
                for (const prop of Object.getOwnPropertyNames(parent)) {
                    const value = (parent as any)[prop];
                    if (value == node) {
                        if (Array.isArray(replacement)) {
                            throw new Error(
                                `Cannot insert array of nodes into property ${prop} of ${parent.type}`
                            );
                        }
                        (parent as any)[prop] = replacement;
                    } else if (Array.isArray(value)) {
                        const array = value as Array<any>;
                        let index = array.indexOf(target);
                        if (index != -1) {
                            if (after)
                                index ++;
                            if (Array.isArray(replacement)) {
                                array.splice(index, delete_count, ...replacement);
                            } else if (replacement) {
                                array.splice(index, delete_count, replacement);
                            } else {
                                array.splice(index, delete_count);
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Removes a node within the given section of the AST.
     * @param root The root node.
     * @param target The node to remove.
     */
    static removeNode(root: Shift.Node, target: Shift.Node): void {
        this.replaceNode(root, target, null);
    }

    /**
     * Removes a node within the given section of the AST.
     * @param root The root node.
     * @param target The node to remove.
     * @param insert: The insert node, nodes or null.
     * @param after
     */
    static insertNode(root: Shift.Node, target: Shift.Node, insert: Shift.Node | Shift.Node[] | null, after = false): void {
        this.replaceNode(root, target, insert, 0, after);
    }
}
