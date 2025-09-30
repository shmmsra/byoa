/* eslint-disable-next-line spaced-comment */
import { Component } from 'react';
import { GLOBAL_PLAYER_ID } from '../../utils/constants';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        const { errorCallback } = this.props;
        console.error(`${GLOBAL_PLAYER_ID}: ErrorBoundary: componentDidCatch: Error: `, error.message, errorInfo);
        if (errorCallback) {
            try {
                errorCallback();
            } catch (e) {
                console.error(`${GLOBAL_PLAYER_ID}: ErrorBoundary: componentDidCatch: Exception in errorCallback: ${e.message}`);
            }
        }
    }

    render() {
        const { hasError } = this.state;
        const { children, errorComponent } = this.props;

        if (hasError) {
            return errorComponent;
        }
        return children;
    }
}

export default ErrorBoundary;
