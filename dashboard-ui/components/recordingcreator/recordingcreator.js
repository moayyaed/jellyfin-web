﻿define(['components/paperdialoghelper', 'scripts/livetvcomponents', 'livetvcss', 'paper-checkbox', 'paper-input'], function (paperDialogHelper) {

    var currentProgramId;
    var currentDialog;
    var currentResolve;
    var currentReject;

    function getDaysOfWeek() {

        // Do not localize. These are used as values, not text.
        return LiveTvHelpers.getDaysOfWeek().map(function (d) {
            return d.value;
        });
    }

    function getDays(context) {

        var daysOfWeek = getDaysOfWeek();

        var days = [];

        for (var i = 0, length = daysOfWeek.length; i < length; i++) {

            var day = daysOfWeek[i];

            if ($('#chk' + day, context).checked()) {
                days.push(day);
            }

        }

        return days;
    }

    function hideSeriesRecordingFields(context) {
        $('#seriesFields', context).hide();
        context.querySelector('.btnSubmitContainer').classList.remove('hide');
        context.querySelector('.supporterContainer').classList.add('hide');
    }

    function closeDialog(isSubmitted) {

        paperDialogHelper.close(currentDialog);

        if (isSubmitted) {
            currentResolve();
        } else {
            currentReject();
        }
    }

    function onSubmit() {

        Dashboard.showLoadingMsg();

        var form = this;

        ApiClient.getNewLiveTvTimerDefaults({ programId: currentProgramId }).then(function (item) {

            item.PrePaddingSeconds = $('#txtPrePaddingMinutes', form).val() * 60;
            item.PostPaddingSeconds = $('#txtPostPaddingMinutes', form).val() * 60;

            item.RecordNewOnly = $('#chkNewOnly', form).checked();
            item.RecordAnyChannel = $('#chkAllChannels', form).checked();
            item.RecordAnyTime = $('#chkAnyTime', form).checked();

            item.Days = getDays(form);

            if ($('#chkRecordSeries', form).checked()) {

                ApiClient.createLiveTvSeriesTimer(item).then(function () {

                    Dashboard.hideLoadingMsg();
                    closeDialog(true);
                });

            } else {
                ApiClient.createLiveTvTimer(item).then(function () {

                    Dashboard.hideLoadingMsg();
                    closeDialog(true);
                });
            }
        });

        // Disable default form submission
        return false;
    }

    function getRegistration(programId) {

        Dashboard.showLoadingMsg();

        return ApiClient.getJSON(ApiClient.getUrl('LiveTv/Registration', {

            ProgramId: programId,
            Feature: 'seriesrecordings'

        })).then(function (result) {

            Dashboard.hideLoadingMsg();
            return result;

        }, function () {

            Dashboard.hideLoadingMsg();
            return {
                TrialVersion: true,
                IsValid: true,
                IsRegistered: false
            };
        });
    }

    function showSeriesRecordingFields(context) {
        $('#seriesFields', context).show();
        context.querySelector('.btnSubmitContainer').classList.remove('hide');

        getRegistration(getParameterByName('programid')).then(function (regInfo) {

            if (regInfo.IsValid) {
                context.querySelector('.btnSubmitContainer').classList.remove('hide');
            } else {
                context.querySelector('.btnSubmitContainer').classList.add('hide');
            }

            if (regInfo.IsRegistered) {

                context.querySelector('.supporterContainer').classList.add('hide');

            } else {

                context.querySelector('.supporterContainer').classList.remove('hide');

                if (AppInfo.enableSupporterMembership) {
                    context.querySelector('.btnSupporter').classList.remove('hide');
                } else {
                    context.querySelector('.btnSupporter').classList.add('hide');
                }

                if (regInfo.TrialVersion) {
                    context.querySelector('.supporterTrial').classList.remove('hide');
                } else {
                    context.querySelector('.supporterTrial').classList.add('hide');
                }
            }
        });
    }

    function init(context) {

        $('#chkRecordSeries', context).on('change', function () {

            if (this.checked) {
                showSeriesRecordingFields(context);
            } else {
                hideSeriesRecordingFields(context);
            }
        });

        $('.btnCancel', context).on('click', function () {

            closeDialog(false);
        });

        $('form', context).off('submit', onSubmit).on('submit', onSubmit);
    }

    function selectDays(page, days) {

        var daysOfWeek = getDaysOfWeek();

        for (var i = 0, length = daysOfWeek.length; i < length; i++) {

            var day = daysOfWeek[i];

            $('#chk' + day, page).checked(days.indexOf(day) != -1);

        }
    }

    function renderRecording(context, defaultTimer, program) {

        $('#chkNewOnly', context).checked(defaultTimer.RecordNewOnly);
        $('#chkAllChannels', context).checked(defaultTimer.RecordAnyChannel);
        $('#chkAnyTime', context).checked(defaultTimer.RecordAnyTime);

        $('#txtPrePaddingMinutes', context).val(defaultTimer.PrePaddingSeconds / 60);
        $('#txtPostPaddingMinutes', context).val(defaultTimer.PostPaddingSeconds / 60);

        if (program.IsSeries) {
            $('#eligibleForSeriesFields', context).show();
        } else {
            $('#eligibleForSeriesFields', context).hide();
        }

        selectDays(context, defaultTimer.Days);

        Dashboard.hideLoadingMsg();
    }

    function reload(context, programId) {

        Dashboard.showLoadingMsg();

        var promise1 = ApiClient.getNewLiveTvTimerDefaults({ programId: programId });
        var promise2 = ApiClient.getLiveTvProgram(programId, Dashboard.getCurrentUserId());

        Promise.all([promise1, promise2]).then(function (responses) {

            var defaults = responses[0];
            var program = responses[1];

            renderRecording(context, defaults, program);
        });
    }

    function showEditor(itemId) {

        return new Promise(function (resolve, reject) {

            currentResolve = resolve;
            currentReject = reject;

            currentProgramId = itemId;
            Dashboard.showLoadingMsg();

            var xhr = new XMLHttpRequest();
            xhr.open('GET', 'components/recordingcreator/recordingcreator.template.html', true);

            xhr.onload = function (e) {

                var template = this.response;
                var dlg = paperDialogHelper.createDialog({
                    removeOnClose: true,
                    theme: 'b'
                });

                dlg.classList.add('formDialog');

                var html = '';

                html += Globalize.translateDocument(template);

                dlg.innerHTML = html;
                document.body.appendChild(dlg);

                paperDialogHelper.open(dlg);

                currentDialog = dlg;

                hideSeriesRecordingFields(dlg);
                init(dlg);

                reload(dlg, itemId);
            }

            xhr.send();
        });
    }

    return {
        show: showEditor
    };
});