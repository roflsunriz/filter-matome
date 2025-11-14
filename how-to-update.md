package.jsonとpackage-lock.jsonのバージョンを更新する（例：300 -> 301）（npm version majorまたはnpm version minorで更新も可能、但しgit statusがクリーンでない場合は更新できないのでタグをプッシュする直前に行うこと）
198_release_notes.mdと198_release_notes.htmlを更新しチェンジログを記録する
README.mdのlatest versionを更新する
最後にコミットとプッシュを行う
git tag "#(version)"
git push origin "#(version)" の操作でGithub Actionsが自動でリリースを作成する。