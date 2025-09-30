import React, { useEffect, useState, useRef } from 'react';
import { Button } from 'antd';
import { diffWords } from 'diff';
import Spinner from '../spinner/index.jsx';
import TextProcessor from '../../stores/text-processor.js';

const FixGrammar = (props) => {
    const [text, setText] = useState(props.text);
    const [spinner, setSpinner] = useState(true);
    const resultAreaRef = useRef(null);

    const onDone = () => {
        props.onDone(text);
    }

    const getPrompt = (action, inputText) => {
        return `${action.id.toLowerCase()}: ${inputText}`;
    };

    const getTextDiffElement = (oldText, newText) => {
        const diff = diffWords(oldText, newText);
        const fragment = document.createDocumentFragment();

        diff.forEach((part) => {
            // green for additions, red for deletions
            // grey for common parts
            const className = part.added ? 'added' : part.removed ? 'removed' : 'common';
            const textList = part.value.split('\n');

            textList.forEach((t, index) => {
                const span = document.createElement('span');
                span.classList.add(className);
                span.appendChild(document.createTextNode(t));
                fragment.appendChild(span);

                if (index < (textList.length - 1)) {
                    fragment.appendChild(document.createElement('br'));
                }
            });
        });

        return fragment;
    }

    useEffect(() => {
        const prompt = getPrompt(props.action, text);
        TextProcessor.generateText(prompt).then((response) => {
            if (response && response.answer) {
                const result = response?.answer;
                const fragment = getTextDiffElement(text, result);
                resultAreaRef.current.appendChild(fragment);
                setText(result);
                setSpinner(false);
            }
        }).catch((error) => {
            props.onDone(null);
        });
    }, []);

    return (
        <div className='fix-grammar-container'>
            { !spinner && <Button className="confirm-button" type="primary" onClick={onDone}>Done</Button> }
            <div id='diff-result' ref={resultAreaRef}/>
            { spinner && <Spinner /> }
        </div>
    );
}

export default FixGrammar;
