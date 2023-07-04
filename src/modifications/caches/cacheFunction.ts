import * as Shift from 'shift-ast';
import TraversalHelper from '../../helpers/traversalHelper';
import Scope from './scope';
import { v4 as uuid } from 'uuid';

export default class CacheFunction {
    id: string;
    node: Shift.FunctionDeclaration | Shift.FunctionExpression;
    parentNode: Shift.Node;
    scope: Scope;
    name: string;
    assignmentStatment: Shift.ExpressionStatement;
    returns: Shift.ReturnStatement[];

    /**
     * Creates a new cache function.
     * @param node The function node.
     * @param parentNode The parent node.
     * @param scope The scope the function is within.
     * @param name The name of the cache function.
     * @param assignmentStatment The assignment taht override cache function.
     * @param returns The return statements.
     */
    constructor(
        node: Shift.FunctionDeclaration | Shift.FunctionExpression,
        parentNode: Shift.Node,
        scope: Scope,
        name: string,
        assignmentStatment: Shift.ExpressionStatement,
        returns: Shift.ReturnStatement[]
    ) {
        this.id = uuid().replace(/-/g, '');
        this.node = node;
        this.parentNode = parentNode;
        this.scope = scope;
        this.name = name;
        this.assignmentStatment = assignmentStatment;
        this.returns = returns;
        // console.log('undefined', this.node.body.statements[0])
    }

    /**
     * Returns the replacement for a call of the cache function.
     */
    makeReplacement() {
        if (this.assignmentStatment.expression.type != 'AssignmentExpression' ||
            this.assignmentStatment.expression.expression.type != 'FunctionExpression')
            throw new Error('assignmentStatment.expression.expression is not FunctionExpression');

        TraversalHelper.replaceNode(this.node, this.assignmentStatment, new Shift.VariableDeclarationStatement({
            declaration: new Shift.VariableDeclaration({
                kind: 'let',
                declarators: [
                    new Shift.VariableDeclarator({
                        binding: new Shift.BindingIdentifier({name: this.name}),
                        init: this.assignmentStatment.expression.expression
                    })
                ]
            })
        }));
        this.returns.forEach(r => TraversalHelper.removeNode(this.node.body, r));
        TraversalHelper.replaceNode(this.parentNode, this.node, this.node.body.statements);
    }
}
