import React, { useEffect, useState, useRef } from 'react';
import { Input } from 'antd';
const { TextArea } = Input;
import classNames from 'classnames';
import Spinner from '../spinner';
import './ai-text.scss';

const AIText = (props) => {
    const [text, setText] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [spinner, setSpinner] = useState(props.typingSpeed > 0);
    const intervalRef = useRef(null);
    const indexRef = useRef(0);
    const textAreaRef = useRef(null);
    let textAreaScrollHeight = 0;

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    }, []);

    const onDone = (text) => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setText(text);
        if (props.readOnly === false) {
            setEditMode(true);
        }
        setSpinner(false);
        props.onDone && props.onDone(text);
    }

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        setText('');
        indexRef.current = 0;
        if (props.typingSpeed > 0) {
            intervalRef.current = setInterval(addText, props.typingSpeed);
        } else {
            onDone(props.text);
        }
    }, [props.text]);

    const addText = () => {
        if (indexRef.current < props.text.length) {
            setText((text) => text + props.text[indexRef.current]);
            indexRef.current = indexRef.current + 1;
        } else {
            onDone(props.text);
        }
        if (textAreaRef.current) {
            const el = textAreaRef.current;
            if (textAreaScrollHeight === el.scrollHeight) {
                return;
            }

            if (Math.abs((el.scrollHeight - el.scrollTop) - el.clientHeight) < 32) {
                textAreaScrollHeight = el.scrollHeight;
                el.scroll({
                    top: el.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }

    return (
        <div className={classNames('text-area-container')}>
            { !editMode ? (
                <div className={classNames('text-area')} ref={textAreaRef}>
                    { text }
                </div>
            ) : (
                <TextArea
                    className={classNames('text-area')}
                    value={text}
                    onChange={(e) => {
                        onDone(e.target.value);
                    }}
                    autoSize
                />
            ) }
            { spinner && <Spinner /> }
        </div>
    );
}

export default AIText;
