import * as path from 'path';
import * as vscode from 'vscode';
import { DataSource } from './dataSource';
import { GitFileStatus } from './types';
import { UNCOMMITTED, getPathFromStr, showErrorMessage } from './utils';
import { Disposable, toDisposable } from './utils/disposable';

export const enum DiffSide {
	Old,
	New
}

/**
 * Manages providing a specific revision of a repository file for use in the Visual Studio Code Diff View.
 */
export class DiffDocProvider extends Disposable implements vscode.FileSystemProvider {
	public static scheme = 'git-graph';
	private readonly dataSource: DataSource;
	private readonly docs = new Map<string, DiffDocument>();
	private readonly onDidChangeEventEmitter = new vscode.EventEmitter<vscode.Uri>();

	/**
	 * Creates the Git History Diff Document Provider.
	 * @param dataSource The Git History DataSource instance.
	 */
	constructor(dataSource: DataSource) {
		super();
		this.dataSource = dataSource;

		this.registerDisposables(
			vscode.workspace.onDidCloseTextDocument((doc) => this.docs.delete(doc.uri.toString())),
			this.onDidChangeEventEmitter,
			toDisposable(() => this.docs.clear())
		);
	}
	private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
		return this._onDidChangeFile.event;
	}
	watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
		return {
			dispose: () => {
				// nothing to dispose
			},
		};
	}
	stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		return{
			type: vscode.FileType.File,
			size: 0,
			ctime: 0,
			mtime: 0,
		}
	}
	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		throw new Error('Method not implemented.');
	}
	createDirectory(uri: vscode.Uri): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}
	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		const request = decodeDiffDocUri(uri);
		if (!request.exists) {
			return new Buffer(0);
		}
		return this.dataSource.getCommitFile(request.repo, request.commit, request.filePath)
	}
	writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}
	delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}
	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}

	/**
	 * An event to signal a resource has changed.
	 */
	get onDidChange() {
		return this.onDidChangeEventEmitter.event;
	}

}

/**
 * Represents the content of a Diff Document.
 */
class DiffDocument {
	private readonly body: string;

	/**
	 * Creates a Diff Document with the specified content.
	 * @param body The content of the document.
	 */
	constructor(body: string) {
		this.body = body;
	}

	/**
	 * Get the content of the Diff Document.
	 */
	get value() {
		return this.body;
	}
}


/* Encoding and decoding URI's */

/**
 * Represents the data passed through `git-graph://file.ext?encoded-data` URI's by the DiffDocProvider.
 */
type DiffDocUriData = {
	filePath: string;
	commit: string;
	repo: string;
	exists: boolean;
};

/**
 * Produce the URI of a file to be used in the Visual Studio Diff View.
 * @param repo The repository the file is within.
 * @param filePath The path of the file.
 * @param commit The commit hash specifying the revision of the file.
 * @param type The Git file status of the change.
 * @param diffSide The side of the Diff View that this URI will be displayed on.
 * @returns A URI of the form `git-graph://file.ext?encoded-data` or `file://path/file.ext`
 */
export function encodeDiffDocUri(repo: string, filePath: string, commit: string, type: GitFileStatus, diffSide: DiffSide): vscode.Uri {
	if (commit === UNCOMMITTED && type !== GitFileStatus.Deleted) {
		return vscode.Uri.file(path.join(repo, filePath));
	}

	const fileDoesNotExist = (diffSide === DiffSide.Old && type === GitFileStatus.Added) || (diffSide === DiffSide.New && type === GitFileStatus.Deleted);
	const data: DiffDocUriData = {
		filePath: getPathFromStr(filePath),
		commit: commit,
		repo: repo,
		exists: !fileDoesNotExist
	};

	let extension: string;
	if (fileDoesNotExist) {
		extension = '';
	} else {
		const extIndex = data.filePath.indexOf('.', data.filePath.lastIndexOf('/') + 1);
		extension = extIndex > -1 ? data.filePath.substring(extIndex) : '';
	}

	return vscode.Uri.file('file' + extension).with({
		scheme: DiffDocProvider.scheme,
		query: Buffer.from(JSON.stringify(data)).toString('base64')
	});
}

/**
 * Decode the data from a `git-graph://file.ext?encoded-data` URI.
 * @param uri The URI to decode data from.
 * @returns The decoded DiffDocUriData.
 */
export function decodeDiffDocUri(uri: vscode.Uri): DiffDocUriData {
	return JSON.parse(Buffer.from(uri.query, 'base64').toString());
}
