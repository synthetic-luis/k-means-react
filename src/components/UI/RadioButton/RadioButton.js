import React from 'react';
import './RadioButton.scss';
// import scatterIcon from './images/scatter_icon.png';

const RadioButton = ( props ) => {
    return (
        <div className="RadioButton">
            <input id={ props.id } onChange={ props.changed } value={ props.value } type="radio" checked={ props.isSelected } />
            <label htmlFor={ props.id }>{ props.label }</label>
        </div>
    );
}

export default RadioButton;