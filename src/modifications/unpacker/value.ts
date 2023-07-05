import * as Shift from 'shift-ast';
import Constant from './constant';
import Scope from './scope';
import type { LiteralExpression } from '../../helpers/types';

export default class RValue extends Constant<LiteralExpression>{
    readonly ID = 'value';

    addDeclarationToScope(node: Shift.Node, parent: Shift.Node, scope: Scope): boolean {
        const { name, expretion } = this.getVariableDeclarator(node);
        if (
            expretion &&
            expretion.type.startsWith('Literal') &&
            !this.nodesSet.has(node)
        ) {
            scope.addVariable(new RValue(node, parent, name, expretion as LiteralExpression));
            this.nodesSet.add(node);
            return true;
        }
        return false;
    }

    getReplacement(metadata: any): Shift.Expression | undefined {
        return this.elements;
    }

    replaceSimpleAccess(node: Shift.Node, parent: Shift.Node, scope: Scope, name?: string, metadata?: any) {
        if (
            node.type == 'IdentifierExpression'
        ) {
            super.replaceSimpleAccess(node, parent, scope, node.name, node);
        }
    }
}
