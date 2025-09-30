import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import './spinner.scss';

const Spinner = (props) => {
    return (
        <div className='spinner-container'>
            <div className='spinner-overlay' />
            <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
    );
}

export default Spinner;
