import * as Shift from 'shift-ast';
import Constant from './constant';
import Scope from './scope';

export default class RObject extends Constant<Shift.ObjectExpression>{
    readonly ID = 'object';

    addDeclarationToScope(node: Shift.Node, parent: Shift.Node, scope: Scope): boolean {
        const { name, expretion } = this.getVariableDeclarator(node);
        if (
            expretion &&
            expretion.type == 'ObjectExpression' &&
            expretion.properties.every(e => e.type == 'DataProperty')
        ) {
            scope.addVariable(new RObject(node, parent, name, expretion));
            this.nodesSet.add(node);
            return true;
        }
        return false;
    }

    getReplacement(metadata: any): Shift.Expression | undefined {
        const replacement = this.elements.properties.find(e =>
            e && e.type == 'DataProperty' && e.name.type == 'StaticPropertyName' && e.name.value == metadata
        ) as Shift.DataProperty | undefined;

        if (metadata == 'b')
            console.log(replacement?.expression)
        if (replacement?.expression?.type?.startsWith('Literal')) {
            return replacement.expression;
        }
    }

    replaceSimpleAccess(node: Shift.Node, parent: Shift.Node, scope: Scope, name?: string, metadata?: any) {
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
        super.replaceSimpleAccess(node, parent, scope, node.object.name, index);
    }
}