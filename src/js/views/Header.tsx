import * as React from 'react';
import {Link} from 'react-router';

import '../../css/Header.scss';

export interface HeaderProps { }

export class Header extends React.Component<HeaderProps, {}> {

    render() {
        return <div className="header">
            <nav className="navbar navbar">
                <div className="container-fluid">
                    <div className="navbar-header">
                        <Link className="navbar-brand" to="/">GridAPPS-D</Link>
                    </div>

                    <div className="collapse navbar-collapse">
                        <ul className="nav navbar-nav">
                            <li><Link to="/ieee8500">IEEE 8500</Link></li>
                        </ul>
                        <ul className="nav navbar-nav navbar-right">
                            <li><Link to="/help">Help</Link></li>
                        </ul>
                    </div>
                </div>
            </nav>

        </div>
    }
}