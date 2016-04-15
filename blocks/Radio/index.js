import React from 'react';
import bem from 'b_';
import BemComponent, { BemControl } from '../BemComponent';
import Button from '../Button';

const b = bem.with('radio');

class Radio extends BemComponent {
    constructor( props ) {
        super( props );

        Object.assign( this.state, {
            checked: props.checked
        } );

        this.onClick = this.onClick.bind( this );
    }

    render() {
        var name = this.props.name || this.context.name;
        var value = this.props.value;

        var theme = this.props.theme || this.context.theme;
        var size = this.props.size || this.context.size;
        var type = this.props.type || this.context.type;
        var checked = this.state.checked;
        var disabled = this.props.disabled;
        var hovered = this.state.hovered;

        var className = b({ theme, size, type, checked, disabled, hovered });

        return (
            <BemControl>
                <label className={ className }>
                    <Button theme={ theme } size={ size } type={ type } checked={ checked } disabled={ disabled } onClick={ this.onClick }>
                        { this.props.children }
                    </Button>
                    <input ref='control' className={ b('control') } type='radio' autoComplete='off' name={ name } value={ value } disabled={ disabled }/>
                </label>
            </BemControl>
        );
    }

    onClick() {
        //this.refs.control.checked = true;
        this.setState( { checked: true } );

        this.props.onCheck( this.props.value );
    }
}

Radio.defaultProps = {
    onCheck: function() {}
};

Radio.contextTypes = {
    theme: React.PropTypes.string,
    size: React.PropTypes.string,
    type: React.PropTypes.string,
    name: React.PropTypes.string,
    value: React.PropTypes.any
};

module.exports = Radio;
