import bem from 'b_';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Overlay from './overlay';
import Layer from './layer';

const b = bem.with('popup');

const VIEWPORT_ACCURACY_FACTOR = 0.99;
const DEFAULT_DIRECTIONS = [
    'bottom-left', 'bottom-center', 'bottom-right',
    'top-left', 'top-center', 'top-right',
    'right-top', 'right-center', 'right-bottom',
    'left-top', 'left-center', 'left-bottom'
];

class Popup extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            visible: props.visible,
            direction: props.direction,
            left: undefined,
            top: undefined,
            zIndex: 0,
        };
        this.shouldRenderToOverlay = false;
        this.domNode = null;
        this.isPopupVisible = this.isPopupVisible.bind(this);
    }

    getChildContext() {
        return {
            isParentPopupVisible: this.isPopupVisible,
        };
    }

    componentDidMount() {
        this.domNode = ReactDOM.findDOMNode(this);
    }

    componentWillUnmount() {
        this.domNode = null;
    }

    componentWillReceiveProps({ visible }) {
        this.setState({ visible });

        this.handleParentPopupHide();

        // NOTE(@narqo): `setState` is asynchronous, so we can't check only `this.state.visible`
        if (this.state.visible || visible) {
            const { direction, left, top } = this.calcBestDrawingParams();
            this.setState({ direction, left, top });
        }
    }

    componentWillUpdate(nextProps, nextState) {
        if (!this.shouldRenderToOverlay && nextState.visible === true) {
            this.shouldRenderToOverlay = true;
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.visible !== this.state.visible) {
            this.props.onVisibilityChange(this.state.visible);
        }
    }

    render() {
        const { theme } = this.props;
        const { direction, visible } = this.state;

        let className = b({ direction, theme, visible });

        if (this.shouldRenderToOverlay) {
            // FIXME(@narqo): `popup_js_inited` must be set for CSS of bem-components
            className += ' ' + b({ js: 'inited' });

            const { left, top, zIndex } = this.state;

            return (
                <Overlay>
                    <Layer visible={visible} onOrderChange={zIndex => this.onLayerOrderChange(zIndex)}>
                        {this.renderPopup(className, { left, top, zIndex })}
                    </Layer>
                </Overlay>
            );
        } else {
            return this.renderPopup(className);
        }
    }

    renderPopup(className, popupStyle = {}) {
        return <div className={className} style={popupStyle}>{this.props.children}</div>;
    }

    handleParentPopupHide() {
        const { isParentPopupVisible } = this.context;
        if (typeof isParentPopupVisible === 'function' && isParentPopupVisible() === false) {
            this.setState({ visible: false });
        }
    }

    onLayerOrderChange(zIndex) {
        this.setState({ zIndex });
    }

    isPopupVisible() {
        return this.state.visible;
    }

    calcBestDrawingParams() {
        const popup = this.calcPopupDimensions();
        const target = this.calcTargetDimensions();
        const viewport = this.calcViewportDimensions();

        let i = 0,
            direction,
            position,
            viewportFactor,
            bestDirection,
            bestPos,
            bestViewportFactor;

        while (direction = this.props.directions[i++]) {
            position = this.calcPopupPosition(direction, target, popup);
            viewportFactor = this.calcViewportFactor(position, viewport, popup);

            if (i === 1 || viewportFactor > bestViewportFactor || (!bestViewportFactor && this.state.direction === direction)) {
                bestDirection = direction;
                bestViewportFactor = viewportFactor;
                bestPos = position;
            }
            if (bestViewportFactor > VIEWPORT_ACCURACY_FACTOR) break;
        }

        return {
            direction: bestDirection,
            left: bestPos.left,
            top: bestPos.top
        };
    }

    calcTargetDimensions() {
        return {
            left: 0,
            top: 0,
            with: 0,
            height: 0,
        };
    }

    calcViewportDimensions() {
        const winTop = window.pageYOffset;
        const winLeft = window.pageXOffset;
        const winHeight = window.innerHeight;
        const winWidth = window.innerWidth;

        return {
            top : winTop,
            left : winLeft,
            bottom : winTop + winHeight,
            right : winLeft + winWidth,
        };
    }

    calcViewportFactor(pos, viewport, popup) {
        const viewportOffset = this.props.viewportOffset;
        const intersectionLeft = Math.max(pos.left, viewport.left + viewportOffset);
        const intersectionRight = Math.min(pos.left + popup.width, viewport.right - viewportOffset);
        const intersectionTop = Math.max(pos.top, viewport.top + viewportOffset);
        const intersectionBottom = Math.min(pos.top + popup.height, viewport.bottom - viewportOffset);

        if (intersectionLeft < intersectionRight && intersectionTop < intersectionBottom) {
            // has intersection
            return (intersectionRight - intersectionLeft) * (intersectionBottom - intersectionTop) / popup.area;
        } else {
            return 0;
        }
    }

    calcPopupDimensions() {
        const popupWidth = this.domNode.outerWidth;
        const popupHeight = this.domNode.outerHeight;

        return {
            width : popupWidth,
            height : popupHeight,
            area : popupWidth * popupHeight
        };
    }

    calcPopupPosition(direction, target, popup) {
        const { mainOffset, secondaryOffset } = this.props;
        let top, left;

        if (checkMainDirection(direction, 'bottom')) {
            top = target.top + target.height + mainOffset;
        } else if (checkMainDirection(direction, 'top')) {
            top = target.top - popup.height - mainOffset;
        } else if (checkMainDirection(direction, 'left')) {
            left = target.left - popup.width - mainOffset;
        } else if (checkMainDirection(direction, 'right')) {
            left = target.left + target.width + mainOffset;
        }

        if (checkSecondaryDirection(direction, 'right')) {
            left = target.left + target.width - popup.width - secondaryOffset;
        } else if (checkSecondaryDirection(direction, 'left')) {
            left = target.left + secondaryOffset;
        } else if (checkSecondaryDirection(direction, 'bottom')) {
            top = target.top + target.height - popup.height - secondaryOffset;
        } else if (checkSecondaryDirection(direction, 'top')) {
            top = target.top + secondaryOffset;
        } else if (checkSecondaryDirection(direction, 'center')) {
            if (checkMainDirection(direction, 'top', 'bottom')) {
                left = target.left + target.width / 2 - popup.width / 2;
            } else if (checkMainDirection(direction, 'left', 'right')) {
                top = target.top + target.height / 2 - popup.height / 2;
            }
        }

        return { top, left };
    }
}

function checkMainDirection(direction, mainDirection1, mainDirection2) {
    return !direction.indexOf(mainDirection1) || (mainDirection2 && !direction.indexOf(mainDirection2));
}

function checkSecondaryDirection(direction, secondaryDirection) {
    return ~direction.indexOf('-' + secondaryDirection);
}

Popup.defaultProps = {
    autoclosable: false,
    visible: false,
    directions: DEFAULT_DIRECTIONS,
    mainOffset: 0,
    secondaryOffset: 0,
    viewportOffset: 0,
    onVisibilityChange() {},
};

Popup.childContextTypes = Popup.contextTypes = {
    isParentPopupVisible: React.PropTypes.func,
};

export default Popup;
