import React, { Component } from 'react';
import GenText from './gen-text';
import FixGrammar from './fix-grammar';
import { ACTIONS, WINDOW_SIZE } from '../../utils/constants';

import './index.scss';

export default class EditWorkflow extends Component {
    constructor(props) {
        super(props);
        this.state = {
            imgBlobs: [],
            imgUrls: [],
            type: '',
            showSpinner: false,
            currentImgIdx: 0,
        };
        this.imgDimensions = { width: WINDOW_SIZE.DEFAULT_WIDTH, height: WINDOW_SIZE.DEFAULT_HEIGHT };
    }

    onGenTextDone = (text) => {
        const { onDone } = this.props;

        if (!text) {
            onDone(null);
            return;
        }
        onDone([{
            type: 'text',
            data: text,
        }]);
    }

    onTextToImageDone = (blob) => {
        const { onDone } = this.props;

        if (!blob) {
            onDone(null);
            return;
        }
        onDone([{
            type: 'image',
            data: blob,
        }]);
    }

    onTextToImageError = (error) => {
        const { onError } = this.props;
        onError(error);
    }

    onRemoveBackgroundDone = (blob) => {
        const { onDone } = this.props;

        if (!blob) {
            onDone(null);
            return;
        }
        onDone([{
            type: 'image',
            data: blob,
        }]);
    }

    onGenFillDone = (blob) => {
        const { onDone } = this.props;

        if (!blob) {
            onDone(null);
            return;
        }
        onDone([{
            type: 'image',
            data: blob,
        }]);
    }

    onCropImageDone = (blob) => {
        const { onDone } = this.props;

        if (!blob) {
            onDone(null);
            return;
        }
        onDone([{
            type: 'image',
            data: blob,
        }]);
    }

    onGenFillDone = (blob) => {
        const { onDone } = this.props;

        if (!blob) {
            onDone(null);
            return;
        }
        onDone([{
            type: 'image',
            data: blob,
        }]);
    }

    getWorkflowComponent() {
        const { action, data: [{ type, data }] } = this.props;
        const { id: actionId, context: actionContext } = action;

        if (type === 'text') {
            if (actionId === ACTIONS.REPHRASE
                || actionId === ACTIONS.SUMMARIZE
                || actionId === ACTIONS.EXPLAIN
                || actionId === ACTIONS.ASK
            ) {
                return (<GenText action={action} text={data} onDone={this.onGenTextDone} />);
            } else if (actionId === ACTIONS.CORRECT_GRAMMAR) {
                return (<FixGrammar action={action} text={data} onDone={this.onGenTextDone} />);
            }
        }

        return null;
    }

    render() {
        return (
            <div className='edit-workflow-container'>
                { this.getWorkflowComponent() }
            </div>
        );
    }
};
