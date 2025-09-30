import React, { useEffect, useState, useRef } from 'react';
import { Button, Input } from 'antd';
import AssistantStore from '../../stores/assistant-store.js';
import AIText from '../ai-text/index.jsx';
import { ACTIONS, TEXT_ACTIONS } from '../../utils/constants.js';

import './preview.scss';

const PreviewContent = (props) => {
    const { data: [{ type, data }], onAction = (() => {}) } = props;
    const [textFieldData, setTextFieldData] = useState('');

    useEffect(() => {
        if (type === 'text') {
            AssistantStore.setWindowDimensions(630, 300);
        }
    }, [props.data]);

    const getActionRows = (actionList) => {
        // Create a copy of the list first
        const buttonList = actionList.slice().filter((action) => action !== ACTIONS.ASK);

        const buttonRows = [];
        while (buttonList.length > 0) {
            buttonRows.push(
                <div className="button-row">{
                    buttonList.splice(0, 5).map((action) => {
                        return (
                            <Button
                                key={action}
                                type="primary"
                                className="button-item"
                                onClick={() => onAction({ id: action, context: '' }, props.data)}
                            >
                                { action }
                            </Button>
                        );
                    })
                }</div>
            );
        }
        return (
            <div className="action-list">
                <div className="button-row-list">{ buttonRows }</div>
                {actionList.includes(ACTIONS.ASK) && (
                    <div className="text-field-wrapper">
                        <Input
                            autoFocus={true}
                            className="ant-input-override"
                            placeholder={'Ask...'}
                            onChange={(e) => { setTextFieldData(e.target.value) }}
                            value={textFieldData}
                            spellCheck={false}
                            autoCorrect="off"
                            autoComplete="off"
                        />
                        <Button
                            type="primary"
                            className="button-item"
                            onClick={() => onAction({ id: ACTIONS.ASK, context: textFieldData }, props.data)}
                        >
                            { ACTIONS.ASK }
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    let previewComponent = null;
    let actionsComponent = null;
    if (type === 'text') {
        previewComponent = <AIText text={data} typingSpeed={0} />;
        actionsComponent = getActionRows(TEXT_ACTIONS);
    }

    return (
        <div className='preview-content-container'>
            <div className='preview-content'>{ previewComponent }</div>
            <div className='preview-buttons'>{ actionsComponent }</div>
        </div>
    );
}

export default PreviewContent;
