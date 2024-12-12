import PropTypes from 'prop-types';
import React from 'react';

import styles from './watermark.module.css';

const Watermark = props => (
    <img
        className={styles.spriteImage}
        src={props.costumeURL}
    />
);

Watermark.propTypes = {
    costumeURL: PropTypes.string
};

export default Watermark;
