import React, { useEffect, useState, useRef } from 'react';
import Spinner from '../spinner/index.jsx';
import AIText from '../ai-text';
import TextProcessor from '../../stores/text-processor.js';
import { ACTIONS } from '../../utils/constants.js';

const GenText = (props) => {
    const [text, setText] = useState(props.text);
    const [spinner, setSpinner] = useState(true);
    const [typingSpeed, setTypingSpeed] = useState(0);

    const onDone = (text) => {
        // For the initial text prompt, typingSpeed would be zero
        if (typingSpeed) {
            props.onDone(text);
        }
    }

    const getPrompt = (action, inputText) => {
        switch (action.id) {
            case ACTIONS.EXPLAIN:
                return `Explain in detail: ${inputText}`;
            case ACTIONS.ASK:
                return `${action.context}: ${inputText}`;
        }
        return `${action.id.toLowerCase()}: ${inputText}`;
    };

    useEffect(() => {
        const prompt = getPrompt(props.action, text);
        TextProcessor.generateText(prompt).then((response) => {
            if (response && response.answer) {
                const result = response?.answer;
                setTypingSpeed(5);
                setText(result);
                setSpinner(false);
            }
        }).catch((error) => {
            props.onDone(null);
        });
    }, []);

    return (
        <div className='gen-text-container'>
            <AIText text={text} typingSpeed={typingSpeed} onDone={onDone} />
            { spinner && <Spinner /> }
        </div>
    );
}

export default GenText;
