import React, { Component } from 'react';
import { ConfigProvider } from 'antd';
import HistoryStore from '../../stores/history.js';
import ErrorBoundary from '../error-boundary/index.jsx';
import TitleBar from '../titlebar/index.jsx';
import EditWorkflow from '../edit-workflow/index.jsx';
import PreviewContent from '../preview-content/index.jsx';
import { GLOBAL_PLAYER_ID, BUTTON_ID_LIST } from '../../utils/constants.js';

import './assistant.scss';

const COMPONENT_ID = 'Assistant';

export default class Assistant extends Component {
    constructor(props) {
        super(props);
        this.state = {
            action: null,
            data: null,
        };

        HistoryStore.on('change', () => {
            const history = HistoryStore.top();
            if (!history || !history.data || !history.data.length) {
                this.setState({ action: null, data: null });
                return;
            }

            this.setState({ action: history.action || null, data: history.data });
        });
    }

    onActionTrigger(action, data) {
        HistoryStore.replace(action, data);
    }

    onActionComplete(data) {
        HistoryStore.push(null, data);
    }

    onActionError() {
        const history = HistoryStore.top();
        HistoryStore.replace(null, history.data);
    }

    getHeaderComponent() {
        return (
            <TitleBar data={{
                title: 'AI Assistant',
                buttonList: [
                    { id: BUTTON_ID_LIST.UNDO, tooltipLabel: BUTTON_ID_LIST.UNDO },
                    { id: BUTTON_ID_LIST.RETRY, tooltipLabel: BUTTON_ID_LIST.RETRY },
                    { id: BUTTON_ID_LIST.COPY, tooltipLabel: BUTTON_ID_LIST.COPY },
                ],
            }} action={this.state.action} />
        );
    }

    getToastMessageComponent() {
    }

    getPreviewComponent() {
        const { action, data } = this.state;
        // If either action is in progress or no data is available, then its not a Preview mode
        if (action || !data) {
            return null;
        }

        return (<PreviewContent data={data} onAction={this.onActionTrigger} />);
    }

    getWorkflowComponent() {
        const { action, data } = this.state;
        // If either action is not in progress or no data is available, then its not an EditWorkflow mode
        if (!action || !data) {
            return null;
        }

        return (<EditWorkflow action={action} data={data} onDone={this.onActionComplete} onError={this.onActionError} />);
    }

    getAppComponent() {
        if (!this.state.data) {
            return null;
        }

        return (
            <div className='assistant-content-wrapper'>
                { this.getHeaderComponent() }
                { this.getPreviewComponent() }
                { this.getWorkflowComponent() }
            </div>
        );
    }

    render() {
        return (
            <ConfigProvider className="aca-provider">
                <ErrorBoundary
                    errorComponent={() => null}
                    errorCallback={() => console.error(`${GLOBAL_PLAYER_ID}: ${COMPONENT_ID}: Exception in Assistant component`)}
                >
                    <div className='assistant-container'>
                        <div className='assistant-background' />
                        { this.getAppComponent() }
                    </div>
                </ErrorBoundary>
            </ConfigProvider>
        );
    }
}
