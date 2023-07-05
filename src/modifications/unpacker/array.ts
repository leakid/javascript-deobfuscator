import * as Shift from 'shift-ast';
import Constant from './constant';
import Scope from './scope';

export default class RArray extends Constant<(Shift.Expression | Shift.SpreadElement | null)[]>{
    readonly ID = 'array';

    addDeclarationToScope(node: Shift.Node, parent: Shift.Node, scope: Scope): boolean {
        const { name, expretion } = this.getVariableDeclarator(node);
        if (
            expretion &&
            expretion.type == 'ArrayExpression' &&
            expretion.elements.every(e => !e || e.type.startsWith('Literal')) &&
            !this.nodesSet.has(node)
        ) {
            scope.addVariable(new RArray(node, parent, name, expretion.elements));
            this.nodesSet.add(node);
            return true;
        }
        return false;
    }

    getReplacement(metadata: any): Shift.Expression | undefined {
        const replacement = this.elements[metadata];
        if (!replacement || replacement.type == 'SpreadElement')
            return;
        return replacement;
    }

    replaceSimpleAccess(node: Shift.Node, parent: Shift.Node, scope: Scope, name?: string, metadata?: any) {
        if (
            node.type == 'ComputedMemberExpression' &&
            node.object.type == 'IdentifierExpression' &&
            node.expression.type == 'LiteralNumericExpression'
        ) {
            super.replaceSimpleAccess(node, parent, scope, node.object.name, node.expression.value);
        }
    }
}
