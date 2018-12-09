const ORGANIZATION = 'МБУЗ "ГП №2"';

const patientPage = /medok\.ruswizards\.com\/Default\.aspx\?personId=/i;
const schedulePage = /medok\.ruswizards\.com\/Schedule\/Default\.aspx\?patientId\=/i;

async function main() {
  try {
    if (patientPage.test(window.location.href)) {
      const patient = parsePatient();
      if (!localStorage.getItem(`patient-${patient.id}`)) {
        localStorage.setItem(`patient-${patient.id}`, JSON.stringify(patient));
      }
    }

    if (schedulePage.test(window.location.href)) {
      const id = window.location.href.split('?')[1].split('&')[0].split('=')[1];
      const data = localStorage.getItem(`patient-${id}`);
      if (data) {
        const patient: Patient = JSON.parse(data);
        let answer: Answer = await rostovtfoms(patient);
        patient.answer = answer;
        localStorage.setItem(`patient-${patient.id}`, JSON.stringify(patient));
        if (patient.answer.noData) {
          ($ as any).toast({
            heading: 'Информация',
            text: 'Данные о прикреплении пациента не найдены',
            hideAfter: 5000,
            position: 'top-left',
            icon: 'info'
          });
        } else {
          if (!patient.answer.attached) {
            let message = 'Пациент прикреплен к другой поликлинике';
            if (patient.answer.organization) {
              message += `: ${patient.answer.organization}`;
            }
            if (patient.answer.from) {
              message += ` c ${patient.answer.from}`;
            }
            ($ as any).toast({
              heading: 'Внимание!',
              text: message,
              hideAfter: false,
              position: 'top-left',
              icon: 'error'
            });
          } else {
          ($ as any).toast({
            heading: 'Информация',
            text: 'Пациент прикреплен к поликлинике',
            hideAfter: 5000,
            position: 'top-left',
            icon: 'success'
          });
        }
        }
      }
    }
  } catch (e) {
    console.warn(e.message, e);
    ($ as any).toast({
      heading: 'Ошибка',
      text: `В работе плагина возникла ошибка: ${e.message}`,
      hideAfter: 1000,
      position: 'top-left',
      icon: 'warn'
    });
  }
}

main();

async function rostovtfoms(patient: Patient): Promise<Answer> {
  const url = 'http://rostov-tfoms.ru/polis/pol_check.php';
  const { last, first, middle, dob, snn, passportSer, passportNum } = patient;
  const body = `seria=&npoli=&viddk=14&serdk=${passportSer}&nomdk=${passportNum}` +
    `&snils=${snn}&famip=${last}&namep=${first}&otchp=${middle}&drogd=${dob}&check_bot=1`;
  try {
    const res = await $.post(url, body.replace(/Нет\sданных/g, ''));
    if (/Вы застрахованы в страховой компании/.test(res)) {
      const organization = ($($.parseHTML(res)).find('td').eq(1).text() || '').replace(/\\/g, '').trim();
      const from = $($.parseHTML(res)).find('td').eq(3).text().trim().replace(/\\/g, '');
      const attached = organization === ORGANIZATION;
      return { attached, from, organization };
    }
  } catch (e) {
    console.warn(e.message, e);
  }
  return { attached: false, noData: true };
}

// async function rir(patient: Patient): Promise<Answer> {
//   const headers = {
//     'Content-Type': 'text/html; charset=UTF-8',
//     'Accept-Encoding': 'gzip, deflate',
//     'Cookie': 'ASP.NET_SessionId=jc5ngzsvjwbmnxizynjoprqv;',
//     'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
//     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36',
//     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
//   };
//   const loginUri = `http://${RIR_SERVER}/FomsInsurance/Login.aspx?ReturnUrl=/FomsInsurance/Forms/AttachedPatients.aspx`;
//   const loginBody = `MainContent_ctl00_LoginPanel1_TextFieldLoginName=${RIR_LOGIN}` +
//                     `&MainContent_ctl00_LoginPanel1_TextFieldLoginPassword=${RIR_PASSWORD}`;
//                     `&Login1_LoginPanelMain_TextFieldLoginName=`;
//                     `&Login1_LoginPanelMain_TextFieldLoginPassword=`;
//   const checkUri = `http://${RIR_SERVER}/FomsInsurance/Forms/AttachedPatients.aspx`;
//   const checkBody = `LastName=${encodeURI(patient.last)}&` +
//                     `FirstName=${encodeURI(patient.first)}&` +
//                     `MiddleName=${encodeURI(patient.middle)}&` +
//                     `BirthDate=${encodeURI(patient.dob)}&${loginBody}`;
//   try {
//     const loginPage = await get(loginUri);
//     const loginRes = await post(loginUri, `${csfr(loginPage)}&${loginBody}`);
//     const checkRes = await post(checkUri, `${csfr(loginPage)}&${checkBody}`);
//     console.log(checkRes);
//   } catch (e) {
//     console.warn(e.message, e);
//   }
//   return { attached: false, noData: true };
//
//   async function post(uri: string, body?: any): Promise<string> {
//     return new Promise<string>((res, rej) => {
//       const currentHeaders = headers;
//       currentHeaders['X-Ext.Net'] = 'delta=true';
//       $.ajax({
//         type: 'POST',
//         url: uri,
//         data: JSON.stringify(`${body}`),
//         headers: currentHeaders,
//         success: (body, status, xhr) => {
//           console.log(xhr.getAllResponseHeaders())
//           res(body);
//         },
//       });
//     });
//   }
//
//   async function get(uri: string): Promise<string> {
//     return new Promise<string>((res, rej) => {
//       const currentHeaders = headers;
//       currentHeaders['X-Ext.Net'] = 'delta=false';
//       $.ajax({
//         type: 'GET',
//         url: uri,
//         headers: currentHeaders,
//         success: (body, status, xhr) => {
//           console.log(xhr.getAllResponseHeaders())
//           res(body);
//         },
//       });
//     });
//   }
//
//   function csfr(html: string): string {
//     const form = /<form[^>]*>((.|[\n\r])*)<\/form>/im.exec(html)[1];
//     const csfr: Array<string> = [];
//     $.each($($.parseHTML(form)).find('input'), function() {
//       csfr.push(`${$(this).attr('name')}=${encodeURI($(this).attr('value'))}`);
//     });
//     return csfr.join('&');
//   }
// }

class Patient {
  public id: string;
  public first: string;
  public middle: string;
  public last: string;
  public dob: string;
  public snn: string;
  public passportSer: string;
  public passportNum: string;
  public answer?: Answer;
}

function parsePatient(): Patient {
  const id = $('html').text().match(/\'dxppkPatient\'\:\'([a-z0-9\-]+)\'/)[1];
  const title = $('.patient_name > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > div:nth-child(1)').text() || '';
  const [last, first, middle] = title.split(/\s/);
  const dob = ($('.patient_general_info > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)').text().trim() || '').replace('Нет данных', '');
  const snn = ($('td.bottom_row:nth-child(6)').text().trim() || '').replace('Нет данных', '');
  const passportPath = 'td.round_panel_content:nth-child(6) > table:nth-child(2) > tbody:nth-child(1)';
  const passportSer = ($(`${passportPath} > tr:nth-child(2) > td:nth-child(2)`).text().trim() || '').replace(' ', '').replace('Нет данных', '');
  const passportNum = ($(`${passportPath} > tr:nth-child(2) > td:nth-child(3)`).text().trim() || '').replace(' ', '').replace('Нет данных', '');
  return { id, last, first, middle, dob, snn, passportSer, passportNum };
}

class Answer {
  public readonly attached: boolean;
  public readonly organization?: string;
  public readonly from?: string;
  public readonly noData?: boolean;
}
