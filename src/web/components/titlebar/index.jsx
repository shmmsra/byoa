import React, { Component } from 'react';
import { Button, Tooltip } from 'antd';
import { UndoOutlined, ReloadOutlined, CopyOutlined, PushpinOutlined, PushpinFilled } from '@ant-design/icons';
import AssistantStore from '../../stores/assistant-store.js';
import MessageController from '../../controller/message-controller.js';
import HistoryStore from '../../stores/history.js';
import { BUTTON_ID_LIST, MESSAGE_TO_NATIVE } from '../../utils/constants.js';

import './titleBar.scss';

const handleDragStart = (e) => {
    if (e.preventDefault) {
        e.preventDefault();
    }

    if (e.stopPropagation) {
        e.stopPropagation();
    }

    MessageController.sendMessageToNative(MESSAGE_TO_NATIVE.DRAG_START, null, false);
};

const handleDragOver = (e) => {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'none';
};

class TitleBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isPinned: AssistantStore.devMode,
        };
    }

    onPinClick = (isPinned) => {
        this.setState({ isPinned });
        AssistantStore.setDevMode(isPinned);
    }

    onUndoClick = () => {
        const data = HistoryStore.top();
        if (data && data.action) {
            return;
        }
        HistoryStore.pop();
        const newData = HistoryStore.top();
        HistoryStore.replace(null, newData.data);
    }

    onRetryClick = () => {
        const data = HistoryStore.top();
        if (data && data.action) {
            return;
        }
        HistoryStore.pop();
    }

    onCopyClick = () => {
        const data = HistoryStore.top();
        if (data && data.action) {
            return;
        }
        AssistantStore.setClipboardData(data.data);
    }

    onButtonClick = ({ id }) => {
        switch (id) {
        case BUTTON_ID_LIST.UNDO:
            this.onUndoClick();
            break;
        case BUTTON_ID_LIST.RETRY:
            this.onRetryClick();
            break;
        case BUTTON_ID_LIST.COPY:
            this.onCopyClick();
            break;
        default:
        }
    }

    render() {
        const { data: { title, buttonList }, action } = this.props;

        return (
            <div className="aa-titleBar"
                draggable="true"
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}>
                <div className="aa-title">{title}</div>
                <div className="aa-buttons">
                    {
                        (window.appContext.build === 'debug') ? (
                            <Button
                                className="aca-button"
                                type="text"
                                icon={this.state.isPinned ? <PushpinFilled /> : <PushpinOutlined />}
                                onClick={() => this.onPinClick(!this.state.isPinned)}
                            />
                        ) : null
                    }
                    {
                        buttonList.filter(() => {
                            if (HistoryStore.size() < 2) {
                                return false;
                            }
                            return true;
                        }).map((buttonData) => {
                            const { id, tooltipLabel } = buttonData;
                            let IconComponent = null;
                            if (!action && id === BUTTON_ID_LIST.UNDO) {
                                IconComponent = UndoOutlined;
                            } else if (!action && id === BUTTON_ID_LIST.RETRY) {
                                IconComponent = ReloadOutlined;
                            } else if (!action && id === BUTTON_ID_LIST.COPY) {
                                IconComponent = CopyOutlined;
                            }
                            if (IconComponent) {
                                return (
                                    <Tooltip
                                        key={id}
                                        title={tooltipLabel}
                                        placement="top"
                                        mouseEnterDelay={0.1}
                                        mouseLeaveDelay={0.1}>
                                        <Button
                                            aria-label={tooltipLabel}
                                            className="aca-button"
                                            type="text"
                                            icon={<IconComponent />}
                                            onClick={() => this.onButtonClick(buttonData)} />
                                    </Tooltip>
                                );
                            }
                            return null;
                        })
                    }
                </div>
            </div>
        );
    }
}

export default TitleBar;
