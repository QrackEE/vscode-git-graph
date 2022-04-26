import { relative, resolve } from 'path';
import { commands, extensions, SourceControl, Uri, window } from 'vscode';
import { API, GitExtension, Repository } from './git';

export class GitAPi {

    private static api: Promise<API>;
    static gitExecutablePath: any;
    public static async getApi() {
        this.api = new Promise(async resolve => {
            const extension = extensions.getExtension<GitExtension>('vscode.git');
            if (!extension?.isActive) {
                await extension?.activate();
            }
            const api = extension!.exports.getAPI(1);
            // Wait for the API to get initialized.
            api.onDidChangeState(() => {
                if (api.state === 'initialized') {
                    resolve(api);
                }
            });
            if (api.state === 'initialized') {
                resolve(api);
            }
        });
        this.gitExecutablePath = this.api.then(api => api.git.path);
        return this.api;
    }

    public static async getRepo(uri?: Uri | SourceControl | string | null): Promise<Repository> {
        const gitUri: SourceControl = uri as any;
        const gitApi = await GitAPi.getApi();
        let currentIndex = 0;
        if (typeof uri == 'string') {
            currentIndex = gitApi.repositories.findIndex(x => resolve(x.rootUri.fsPath) == resolve(uri));
        } else if (gitUri?.rootUri) {
            currentIndex = gitApi.repositories.findIndex(x => gitUri.rootUri?.fsPath == x.rootUri.fsPath);
        }
        return gitApi.repositories[currentIndex];
    }

    public static async getRelative(repoPath: string | null, uri: Uri): Promise<string> {
        const repo = await this.getRepo(repoPath);
        const gitRoot = repo.rootUri.fsPath;
        return relative(gitRoot, uri.fsPath).replace(/\\/g, '/');
    }

    public static async quickSync(uri: SourceControl) {
        const repo = await this.getRepo(uri);
        if (repo.state.workingTreeChanges.length > 0 || repo.state.indexChanges.length > 0) {
            if (!repo.inputBox.value) {
                const confirm = await window.showQuickPick(["YES", "NO"], { placeHolder: "Are you want to quick sync?", ignoreFocusOut: true })
                if (confirm == "YES") {
                    repo.inputBox.value = 'Quick Sync'
                } else {
                    return;
                }
            }
            commands.executeCommand("git.stageAll").then(() => {
                commands.executeCommand("git.commitStaged").then(() => {
                    commands.executeCommand("git.sync")
                });
            });
        } else {
            commands.executeCommand("git.sync")
        }
    }

}